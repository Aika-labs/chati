import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import type { AutoReply, AutoReplyTrigger } from '@prisma/client';

const logger = createModuleLogger('autoreply');

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

// Built-in patterns for common intents
const BUILT_IN_PATTERNS = {
  GREETING: [
    'hola', 'hello', 'hi', 'hey', 'buenos dias', 'buenas tardes', 'buenas noches',
    'buen dia', 'que tal', 'como estas', 'saludos', 'ola', 'holaa', 'holaaa',
    'buenas', 'qué onda', 'que onda', 'holi', 'holii',
  ],
  THANKS: [
    'gracias', 'muchas gracias', 'thank you', 'thanks', 'te agradezco',
    'mil gracias', 'grax', 'thx', 'ty', 'agradecido', 'se agradece',
  ],
  GOODBYE: [
    'adios', 'bye', 'hasta luego', 'nos vemos', 'chao', 'chau', 'hasta pronto',
    'que te vaya bien', 'cuídate', 'cuidate', 'hasta mañana', 'bye bye',
  ],
};

// Default responses for built-in patterns
const DEFAULT_RESPONSES = {
  GREETING: '¡Hola! 👋 Bienvenido. ¿En qué puedo ayudarte hoy?',
  THANKS: '¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?',
  GOODBYE: '¡Hasta luego! 👋 Fue un gusto atenderte. ¡Que tengas un excelente día!',
};

export interface AutoReplyMatch {
  matched: boolean;
  reply?: string;
  ruleId?: string;
  ruleName?: string;
  triggerType?: AutoReplyTrigger;
}

export class AutoReplyService {
  /**
   * Check if a message matches any auto-reply rule
   */
  async findMatch(tenantId: string, message: string): Promise<AutoReplyMatch> {
    const normalizedMessage = message.toLowerCase().trim();

    // Get all active rules for tenant (from cache or DB)
    const rules = await this.getRulesForTenant(tenantId);

    // Sort by priority (higher first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    // Check each rule
    for (const rule of sortedRules) {
      const matched = this.checkRule(rule, normalizedMessage, message);
      if (matched) {
        // Update stats asynchronously (don't wait)
        this.updateRuleStats(rule.id).catch(err => 
          logger.error({ err, ruleId: rule.id }, 'Failed to update rule stats')
        );

        logger.info({
          tenantId,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: rule.triggerType,
        }, 'Auto-reply matched');

        return {
          matched: true,
          reply: rule.response,
          ruleId: rule.id,
          ruleName: rule.name,
          triggerType: rule.triggerType,
        };
      }
    }

    return { matched: false };
  }

  /**
   * Check if a message matches a specific rule
   */
  private checkRule(rule: AutoReply, normalizedMessage: string, originalMessage: string): boolean {
    const messageToCheck = rule.caseSensitive ? originalMessage : normalizedMessage;

    switch (rule.triggerType) {
      case 'KEYWORD':
        return this.checkKeywords(rule, messageToCheck);

      case 'PATTERN':
        return this.checkPattern(rule, messageToCheck);

      case 'GREETING':
        return this.checkBuiltIn('GREETING', normalizedMessage);

      case 'THANKS':
        return this.checkBuiltIn('THANKS', normalizedMessage);

      case 'GOODBYE':
        return this.checkBuiltIn('GOODBYE', normalizedMessage);

      default:
        return false;
    }
  }

  /**
   * Check keyword matching
   */
  private checkKeywords(rule: AutoReply, message: string): boolean {
    const keywords = rule.keywords.map(k => 
      rule.caseSensitive ? k : k.toLowerCase()
    );

    if (rule.exactMatch) {
      // Message must exactly match one of the keywords
      return keywords.includes(message.trim());
    } else {
      // Message must contain at least one keyword
      return keywords.some(keyword => message.includes(keyword));
    }
  }

  /**
   * Check regex pattern matching
   */
  private checkPattern(rule: AutoReply, message: string): boolean {
    if (!rule.pattern) return false;

    try {
      const flags = rule.caseSensitive ? '' : 'i';
      const regex = new RegExp(rule.pattern, flags);
      return regex.test(message);
    } catch (error) {
      logger.error({ error, ruleId: rule.id, pattern: rule.pattern }, 'Invalid regex pattern');
      return false;
    }
  }

  /**
   * Check built-in pattern matching
   */
  private checkBuiltIn(type: 'GREETING' | 'THANKS' | 'GOODBYE', message: string): boolean {
    const patterns = BUILT_IN_PATTERNS[type];
    
    // For built-in patterns, we check if the message starts with or is one of the patterns
    // This avoids false positives like "no gracias" matching THANKS
    const words = message.split(/\s+/);
    const firstWords = words.slice(0, 3).join(' '); // Check first 3 words

    return patterns.some(pattern => {
      // Exact match for short messages
      if (message === pattern) return true;
      // Starts with pattern
      if (firstWords.startsWith(pattern)) return true;
      // First word is pattern (for single-word greetings)
      if (words[0] === pattern) return true;
      return false;
    });
  }

  /**
   * Get all active rules for a tenant (with caching)
   */
  private async getRulesForTenant(tenantId: string): Promise<AutoReply[]> {
    const cacheKey = `autoreply:${tenantId}`;

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as AutoReply[];
      }
    } catch (error) {
      logger.warn({ error, tenantId }, 'Failed to read from cache');
    }

    // Fetch from database
    const rules = await prisma.autoReply.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });

    // Cache the results
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(rules));
    } catch (error) {
      logger.warn({ error, tenantId }, 'Failed to write to cache');
    }

    return rules;
  }

  /**
   * Update rule statistics
   */
  private async updateRuleStats(ruleId: string): Promise<void> {
    await prisma.autoReply.update({
      where: { id: ruleId },
      data: {
        timesTriggered: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });
  }

  /**
   * Invalidate cache for a tenant (call after CRUD operations)
   */
  async invalidateCache(tenantId: string): Promise<void> {
    const cacheKey = `autoreply:${tenantId}`;
    try {
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn({ error, tenantId }, 'Failed to invalidate cache');
    }
  }

  /**
   * Get default response for built-in types
   */
  getDefaultResponse(type: 'GREETING' | 'THANKS' | 'GOODBYE'): string {
    return DEFAULT_RESPONSES[type];
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new auto-reply rule
   */
  async create(tenantId: string, data: {
    name: string;
    triggerType: AutoReplyTrigger;
    keywords: string[];
    pattern?: string | undefined;
    response: string;
    priority?: number | undefined;
    caseSensitive?: boolean | undefined;
    exactMatch?: boolean | undefined;
  }): Promise<AutoReply> {
    const rule = await prisma.autoReply.create({
      data: {
        tenantId,
        name: data.name,
        triggerType: data.triggerType,
        keywords: data.keywords,
        pattern: data.pattern ?? null,
        response: data.response,
        priority: data.priority ?? 0,
        caseSensitive: data.caseSensitive ?? false,
        exactMatch: data.exactMatch ?? false,
      },
    });

    await this.invalidateCache(tenantId);
    logger.info({ tenantId, ruleId: rule.id }, 'Auto-reply rule created');

    return rule;
  }

  /**
   * Update an auto-reply rule
   */
  async update(tenantId: string, ruleId: string, data: {
    name?: string | undefined;
    triggerType?: AutoReplyTrigger | undefined;
    keywords?: string[] | undefined;
    pattern?: string | null | undefined;
    response?: string | undefined;
    priority?: number | undefined;
    caseSensitive?: boolean | undefined;
    exactMatch?: boolean | undefined;
    isActive?: boolean | undefined;
  }): Promise<AutoReply> {
    // Filter out undefined values to avoid overwriting with undefined
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData['name'] = data.name;
    if (data.triggerType !== undefined) updateData['triggerType'] = data.triggerType;
    if (data.keywords !== undefined) updateData['keywords'] = data.keywords;
    if (data.pattern !== undefined) updateData['pattern'] = data.pattern;
    if (data.response !== undefined) updateData['response'] = data.response;
    if (data.priority !== undefined) updateData['priority'] = data.priority;
    if (data.caseSensitive !== undefined) updateData['caseSensitive'] = data.caseSensitive;
    if (data.exactMatch !== undefined) updateData['exactMatch'] = data.exactMatch;
    if (data.isActive !== undefined) updateData['isActive'] = data.isActive;

    const rule = await prisma.autoReply.update({
      where: { id: ruleId, tenantId },
      data: updateData,
    });

    await this.invalidateCache(tenantId);
    logger.info({ tenantId, ruleId }, 'Auto-reply rule updated');

    return rule;
  }

  /**
   * Delete an auto-reply rule
   */
  async delete(tenantId: string, ruleId: string): Promise<void> {
    await prisma.autoReply.delete({
      where: { id: ruleId, tenantId },
    });

    await this.invalidateCache(tenantId);
    logger.info({ tenantId, ruleId }, 'Auto-reply rule deleted');
  }

  /**
   * List all auto-reply rules for a tenant
   */
  async list(tenantId: string): Promise<AutoReply[]> {
    return prisma.autoReply.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a single auto-reply rule
   */
  async get(tenantId: string, ruleId: string): Promise<AutoReply | null> {
    return prisma.autoReply.findFirst({
      where: { id: ruleId, tenantId },
    });
  }

  /**
   * Create default rules for a new tenant
   */
  async createDefaultRules(tenantId: string): Promise<void> {
    const defaultRules = [
      {
        name: 'Saludo automático',
        triggerType: 'GREETING' as AutoReplyTrigger,
        response: DEFAULT_RESPONSES.GREETING,
        priority: 100,
      },
      {
        name: 'Agradecimiento automático',
        triggerType: 'THANKS' as AutoReplyTrigger,
        response: DEFAULT_RESPONSES.THANKS,
        priority: 90,
      },
      {
        name: 'Despedida automática',
        triggerType: 'GOODBYE' as AutoReplyTrigger,
        response: DEFAULT_RESPONSES.GOODBYE,
        priority: 90,
      },
    ];

    await prisma.autoReply.createMany({
      data: defaultRules.map(rule => ({
        ...rule,
        tenantId,
        keywords: [],
      })),
    });

    logger.info({ tenantId }, 'Default auto-reply rules created');
  }
}

export const autoReplyService = new AutoReplyService();
