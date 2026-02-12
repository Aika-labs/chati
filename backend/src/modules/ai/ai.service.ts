import Groq from 'groq-sdk';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { groqCircuitBreaker } from '../gatekeeper/circuit-breaker.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { AIIntent, ConversationContext } from '../../shared/types/index.js';

const logger = createModuleLogger('ai');

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

const MODEL = 'llama-3.3-70b-versatile';
const MAX_CONTEXT_MESSAGES = 10;

export interface AIResponse {
  message: string;
  intent: AIIntent;
  shouldHandoff: boolean;
  suggestedActions?: string[];
}

export class AIService {
  /**
   * Process an incoming message and generate a response
   */
  async processMessage(
    tenantId: string,
    conversationId: string,
    userMessage: string
  ): Promise<AIResponse> {
    // Check circuit breaker
    const canExecute = await groqCircuitBreaker.canExecute('groq');
    if (!canExecute) {
      logger.warn({ tenantId }, 'Groq circuit breaker is open');
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'AI service temporarily unavailable');
    }

    try {
      // Get conversation context
      const context = await this.buildConversationContext(tenantId, conversationId);

      // Detect intent first
      const intent = await this.detectIntent(userMessage, context);

      // Generate response based on intent and context
      const response = await this.generateResponse(userMessage, intent, context);

      // Record success
      await groqCircuitBreaker.recordSuccess('groq');

      // Track usage
      await this.trackUsage(tenantId);

      return response;
    } catch (error) {
      await groqCircuitBreaker.recordFailure('groq');
      logger.error({ error, tenantId, conversationId }, 'AI processing error');
      throw error;
    }
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(message: string, _context: ConversationContext): Promise<AIIntent> {
  async detectIntent(message: string, context: ConversationContext): Promise<AIIntent> {
    const systemPrompt = `Eres un analizador de intenciones. Analiza el mensaje del usuario y determina su intención.

Intenciones posibles:
- schedule: El usuario quiere agendar una cita
- reschedule: El usuario quiere cambiar una cita existente
- cancel: El usuario quiere cancelar una cita
- query_availability: El usuario pregunta por disponibilidad
- query_price: El usuario pregunta por precios
- query_info: El usuario pregunta información general
- greeting: Saludo inicial
- other: Otra intención no clasificada

Responde SOLO con un JSON válido con este formato:
{
  "type": "schedule|reschedule|cancel|query_availability|query_price|query_info|greeting|other",
  "confidence": 0.0-1.0,
  "entities": {
    "date": "fecha mencionada o null",
    "time": "hora mencionada o null",
    "service": "servicio mencionado o null",
    "product": "producto mencionado o null"
  }
}`;

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return this.defaultIntent();
      }

      const parsed = JSON.parse(content) as AIIntent;
      return {
        type: parsed.type || 'other',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
      };
    } catch (error) {
      logger.error({ error }, 'Intent detection failed');
      return this.defaultIntent();
    }
  }

  /**
   * Generate AI response
   */
  private async generateResponse(
    userMessage: string,
    intent: AIIntent,
    context: ConversationContext
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context, intent);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of context.recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseMessage = completion.choices[0]?.message?.content || 
      'Lo siento, no pude procesar tu mensaje. ¿Podrías repetirlo?';

    // Determine if we should handoff to human
    const shouldHandoff = this.shouldHandoffToHuman(intent, responseMessage);

    // Suggest actions based on intent
    const suggestedActions = this.getSuggestedActions(intent);

    return {
      message: responseMessage,
      intent,
      shouldHandoff,
      suggestedActions,
    };
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context: ConversationContext, intent: AIIntent): string {
    const { businessContext, contactInfo } = context;

    let prompt = `Eres un asistente virtual amable y profesional para "${businessContext.services.join(', ') || 'un negocio'}".

REGLAS IMPORTANTES:
1. Responde SIEMPRE en español
2. Sé conciso pero amable (máximo 2-3 oraciones)
3. Si no sabes algo, ofrece conectar con un humano
4. Nunca inventes información sobre precios o disponibilidad
5. Usa emojis con moderación (máximo 1-2 por mensaje)

INFORMACIÓN DEL NEGOCIO:
- Horario: ${businessContext.workingHours}
- Zona horaria: ${businessContext.timezone}
- Servicios: ${businessContext.services.join(', ') || 'No especificados'}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${contactInfo.name || 'No proporcionado'}
- Teléfono: ${contactInfo.phone}
`;

    // Add intent-specific instructions
    switch (intent.type) {
      case 'schedule':
        prompt += `\nEl cliente quiere AGENDAR una cita. Pregunta por el servicio deseado y sugiere horarios disponibles.`;
        break;
      case 'reschedule':
        prompt += `\nEl cliente quiere CAMBIAR una cita. Confirma la cita actual y pregunta por la nueva fecha/hora deseada.`;
        break;
      case 'cancel':
        prompt += `\nEl cliente quiere CANCELAR una cita. Confirma cuál cita desea cancelar y procesa la cancelación.`;
        break;
      case 'query_price':
        prompt += `\nEl cliente pregunta por PRECIOS. Si tienes la información, proporciónala. Si no, indica que un agente le dará los detalles.`;
        break;
      case 'query_availability':
        prompt += `\nEl cliente pregunta por DISPONIBILIDAD. Indica el horario general y ofrece verificar fechas específicas.`;
        break;
      case 'greeting':
        prompt += `\nEs un SALUDO inicial. Saluda amablemente y pregunta en qué puedes ayudar.`;
        break;
    }

    return prompt;
  }

  /**
   * Build conversation context from database
   */
  private async buildConversationContext(
    tenantId: string,
    conversationId: string
  ): Promise<ConversationContext> {
    const [conversation, tenant] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          contact: {
            include: {
              tags: {
                include: { tag: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: MAX_CONTEXT_MESSAGES,
            select: {
              direction: true,
              content: true,
            },
          },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          services: {
            where: { isActive: true },
            select: { name: true },
          },
        },
      }),
    ]);

    if (!conversation || !tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation or tenant not found');
    }

    // Build recent messages (reverse to chronological order)
    const recentMessages = conversation.messages
      .reverse()
      .filter(m => m.content)
      .map(m => ({
        role: m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
        content: m.content!,
      }));

    return {
      tenantId,
      contactId: conversation.contactId,
      conversationId,
      recentMessages,
      contactInfo: {
        ...(conversation.contact.name ? { name: conversation.contact.name } : {}),
        phone: conversation.contact.phone,
        tags: conversation.contact.tags.map(t => t.tag.name),
      },
      businessContext: {
        services: tenant.services.map(s => s.name),
        workingHours: `${tenant.workingHoursStart} - ${tenant.workingHoursEnd}`,
        timezone: tenant.timezone,
      },
    };
  }

  /**
   * Determine if conversation should be handed off to human
   */
  private shouldHandoffToHuman(intent: AIIntent, response: string): boolean {
    // Low confidence intents
    if (intent.confidence < 0.5) return true;

    // Complex intents that might need human
    if (intent.type === 'other') return true;

    // Check for phrases indicating AI uncertainty
    const uncertainPhrases = [
      'no estoy seguro',
      'no puedo',
      'contactar con',
      'hablar con un agente',
      'no tengo esa información',
    ];

    return uncertainPhrases.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
  }

  /**
   * Get suggested actions based on intent
   */
  private getSuggestedActions(intent: AIIntent): string[] {
    switch (intent.type) {
      case 'schedule':
        return ['Ver disponibilidad', 'Ver servicios', 'Contactar agente'];
      case 'query_price':
        return ['Ver lista de precios', 'Contactar agente'];
      case 'query_availability':
        return ['Agendar cita', 'Ver calendario'];
      default:
        return ['Contactar agente'];
    }
  }

  /**
   * Default intent when detection fails
   */
  private defaultIntent(): AIIntent {
    return {
      type: 'other',
      confidence: 0.3,
      entities: {},
    };
  }

  /**
   * Track AI usage
   */
  private async trackUsage(tenantId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageRecord.upsert({
      where: {
        tenantId_type_date: {
          tenantId,
          type: 'AI_REQUESTS',
          date: today,
        },
      },
      create: {
        tenantId,
        type: 'AI_REQUESTS',
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }

  /**
   * Generate a simple response without full context (for quick replies)
   */
  async generateQuickResponse(prompt: string): Promise<string> {
    const canExecute = await groqCircuitBreaker.canExecute('groq');
    if (!canExecute) {
      return 'Lo siento, el servicio no está disponible en este momento.';
    }

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente conciso. Responde en español en máximo 2 oraciones.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      await groqCircuitBreaker.recordSuccess('groq');
      return completion.choices[0]?.message?.content || 'No pude generar una respuesta.';
    } catch (error) {
      await groqCircuitBreaker.recordFailure('groq');
      logger.error({ error }, 'Quick response generation failed');
      return 'Lo siento, hubo un error al procesar tu solicitud.';
    }
  }
}

export const aiService = new AIService();
