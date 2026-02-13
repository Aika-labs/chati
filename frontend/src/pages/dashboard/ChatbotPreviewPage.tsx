import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatbotPreviewPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola! Soy el asistente virtual de tu negocio. ¿En que puedo ayudarte?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call AI endpoint for preview
      const response = await api.post<{
        success: boolean;
        data: { response: string };
      }>('/ai/preview', {
        message: userMessage.content,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.data?.response || 'Lo siento, no pude procesar tu mensaje.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Fallback response if API fails
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Gracias por tu mensaje. Un agente te respondera pronto.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hola! Soy el asistente virtual de tu negocio. ¿En que puedo ayudarte?',
        timestamp: new Date(),
      },
    ]);
  };

  // Sample questions for quick testing
  const sampleQuestions = [
    '¿Cuales son sus horarios?',
    '¿Tienen disponibilidad para hoy?',
    'Quiero agendar una cita',
    '¿Cuanto cuesta el servicio?',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Simulador de Chatbot
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Prueba como responde tu asistente IA sin usar WhatsApp
          </p>
        </div>
        <Button variant="secondary" onClick={handleReset} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Reiniciar conversacion
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Preview */}
        <div className={cn('lg:col-span-2', isExpanded && 'lg:col-span-3')}>
          <Card className="overflow-hidden">
            {/* Chat Header */}
            <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Asistente Virtual</div>
                  <div className="text-sm text-primary-100">En linea</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      'flex gap-3 mb-4',
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        message.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm shadow-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          message.role === 'user'
                            ? 'text-primary-100'
                            : 'text-gray-400'
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="rounded-full w-10 h-10 p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        {!isExpanded && (
          <div className="space-y-6">
            {/* Quick Questions */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Preguntas de prueba
              </h3>
              <div className="space-y-2">
                {sampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Tips para probar
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-primary-500">•</span>
                  Prueba preguntas sobre horarios y disponibilidad
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500">•</span>
                  Intenta agendar una cita ficticia
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500">•</span>
                  Pregunta por precios y servicios
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-500">•</span>
                  Verifica que las respuestas sean coherentes
                </li>
              </ul>
            </Card>

            {/* Stats */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Esta sesion
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {messages.filter((m) => m.role === 'user').length}
                  </div>
                  <div className="text-xs text-gray-500">Mensajes enviados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {messages.filter((m) => m.role === 'assistant').length}
                  </div>
                  <div className="text-xs text-gray-500">Respuestas IA</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
