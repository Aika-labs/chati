import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bot,
  Save,
  RefreshCw,
  Eye,
  FileText,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import api from '../../lib/api';

interface AIConfig {
  systemPrompt: string;
  personality: string;
  tone: 'formal' | 'friendly' | 'professional';
  greeting: string;
  fallbackMessage: string;
  businessName: string;
  businessDescription: string;
}

const DEFAULT_PERSONALITY = `# Personalidad del Asistente

## Rol
Eres un asistente virtual amigable y profesional para {{businessName}}.

## Descripcion del Negocio
{{businessDescription}}

## Instrucciones
1. Saluda cordialmente a los clientes
2. Responde preguntas sobre productos, servicios y horarios
3. Ayuda a agendar citas cuando sea necesario
4. Si no sabes algo, ofrece conectar con un agente humano
5. Mantén un tono {{tone}} en todas las respuestas

## Restricciones
- No inventes información sobre precios o disponibilidad
- No compartas información personal de otros clientes
- Siempre confirma los datos importantes antes de agendar

## Ejemplos de Respuestas
- Saludo: "{{greeting}}"
- Despedida: "¡Gracias por contactarnos! Que tengas un excelente día."
- No entiendo: "{{fallbackMessage}}"
`;

export function AIPersonalityPage() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AIConfig>({
    systemPrompt: '',
    personality: DEFAULT_PERSONALITY,
    tone: 'friendly',
    greeting: '¡Hola! Bienvenido a nuestro negocio. ¿En qué puedo ayudarte hoy?',
    fallbackMessage: 'Disculpa, no entendí tu mensaje. ¿Podrías reformularlo?',
    businessName: '',
    businessDescription: '',
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');

  // Fetch current config
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AIConfig }>('/ai/config');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AIConfig) => {
      const res = await api.post('/ai/config', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
    },
  });

  // Test AI mutation
  const testMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<{ success: boolean; data: { response: string } }>('/ai/preview', {
        message,
        systemPrompt: generateSystemPrompt(),
      });
      return res.data.data.response;
    },
    onSuccess: (response) => {
      setTestResponse(response);
    },
  });

  const generateSystemPrompt = () => {
    return config.personality
      .replace(/\{\{businessName\}\}/g, config.businessName || 'Tu Negocio')
      .replace(/\{\{businessDescription\}\}/g, config.businessDescription || 'Un negocio dedicado a servir a nuestros clientes.')
      .replace(/\{\{tone\}\}/g, config.tone)
      .replace(/\{\{greeting\}\}/g, config.greeting)
      .replace(/\{\{fallbackMessage\}\}/g, config.fallbackMessage);
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...config,
      systemPrompt: generateSystemPrompt(),
    });
  };

  const handleTest = () => {
    if (testMessage.trim()) {
      testMutation.mutate(testMessage);
    }
  };

  const handleReset = () => {
    setConfig({
      ...config,
      personality: DEFAULT_PERSONALITY,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Personalidad de la IA
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura como responde tu asistente virtual
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setPreviewMode(!previewMode)}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            {previewMode ? 'Editar' : 'Vista Previa'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando configuracion...</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Business Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informacion del Negocio
              </h3>
              <div className="space-y-4">
                <Input
                  label="Nombre del Negocio"
                  value={config.businessName}
                  onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                  placeholder="Mi Negocio"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripcion del Negocio
                  </label>
                  <textarea
                    value={config.businessDescription}
                    onChange={(e) => setConfig({ ...config, businessDescription: e.target.value })}
                    placeholder="Describe tu negocio, productos y servicios..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </Card>

            {/* Tone & Messages */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Tono y Mensajes
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tono de Comunicacion
                  </label>
                  <select
                    value={config.tone}
                    onChange={(e) => setConfig({ ...config, tone: e.target.value as 'formal' | 'friendly' | 'professional' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="friendly">Amigable</option>
                    <option value="professional">Profesional</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <Input
                  label="Mensaje de Bienvenida"
                  value={config.greeting}
                  onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                  placeholder="¡Hola! ¿En qué puedo ayudarte?"
                />
                <Input
                  label="Mensaje de Fallback"
                  value={config.fallbackMessage}
                  onChange={(e) => setConfig({ ...config, fallbackMessage: e.target.value })}
                  placeholder="No entendí tu mensaje..."
                />
              </div>
            </Card>

            {/* Personality Editor */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Personalidad (Markdown)
                </h3>
                <Button variant="secondary" size="sm" onClick={handleReset} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Resetear
                </Button>
              </div>
              <textarea
                value={config.personality}
                onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                placeholder="# Personalidad del Asistente..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Variables disponibles: {'{{businessName}}'}, {'{{businessDescription}}'}, {'{{tone}}'}, {'{{greeting}}'}, {'{{fallbackMessage}}'}
              </p>
            </Card>
          </div>

          {/* Preview & Test Panel */}
          <div className="space-y-6">
            {/* Generated System Prompt Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5" />
                System Prompt Generado
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {generateSystemPrompt()}
                </pre>
              </div>
            </Card>

            {/* Test Chat */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Probar Respuesta
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Escribe un mensaje de prueba..."
                    onKeyPress={(e) => e.key === 'Enter' && handleTest()}
                  />
                  <Button onClick={handleTest} disabled={testMutation.isPending || !testMessage.trim()}>
                    {testMutation.isPending ? '...' : 'Probar'}
                  </Button>
                </div>
                {testResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{testResponse}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Tips para una buena personalidad
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• Define claramente el rol y proposito del asistente</li>
                <li>• Incluye ejemplos de respuestas para situaciones comunes</li>
                <li>• Establece limites claros sobre lo que puede y no puede hacer</li>
                <li>• Usa un tono consistente con tu marca</li>
                <li>• Prueba diferentes escenarios antes de guardar</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
