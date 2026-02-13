import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface WebhookEvent {
  event: string;
  description: string;
  category: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  statusCode: number | null;
  responseTime: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export function WebhooksPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  // Fetch webhooks
  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { webhooks: WebhookData[] } }>('/webhooks');
      return res.data.data.webhooks;
    },
  });

  // Fetch available events
  const { data: eventsData } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { events: WebhookEvent[] } }>('/webhooks/events');
      return res.data.data.events;
    },
  });

  // Fetch deliveries for expanded webhook
  const { data: deliveriesData } = useQuery({
    queryKey: ['webhook-deliveries', expandedWebhook],
    queryFn: async () => {
      if (!expandedWebhook) return [];
      const res = await api.get<{ success: boolean; data: { deliveries: WebhookDelivery[] } }>(
        `/webhooks/${expandedWebhook}/deliveries`
      );
      return res.data.data.deliveries;
    },
    enabled: !!expandedWebhook,
  });

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post<{ success: boolean; data: WebhookData & { secret: string } }>('/webhooks', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setIsCreateOpen(false);
      setFormData({ name: '', url: '', events: [] });
      setNewSecret(data.secret);
    },
  });

  // Update webhook mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData & { isActive: boolean }> }) => {
      const res = await api.patch<{ success: boolean; data: WebhookData }>(`/webhooks/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setEditingWebhook(null);
      setFormData({ name: '', url: '', events: [] });
    },
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ success: boolean; data: { success: boolean; statusCode?: number } }>(
        `/webhooks/${id}/test`
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries', expandedWebhook] });
    },
  });

  // Regenerate secret mutation
  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ success: boolean; data: { secret: string } }>(`/webhooks/${id}/regenerate-secret`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setNewSecret(data.secret);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (webhook: WebhookData) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
    });
    setIsCreateOpen(true);
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Group events by category
  const eventsByCategory = eventsData?.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, WebhookEvent[]>) || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'RETRYING':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Recibe notificaciones en tiempo real de eventos en tu cuenta
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Crear Webhook
        </Button>
      </div>

      {/* New Secret Modal */}
      <AnimatePresence>
        {newSecret && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setNewSecret(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Webhook Secret
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Guarda este secret de forma segura. No podras verlo de nuevo.
              </p>
              <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm">
                <code className="flex-1 break-all">{newSecret}</code>
                <button
                  onClick={() => copyToClipboard(newSecret)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <Button className="w-full mt-4" onClick={() => setNewSecret(null)}>
                Entendido
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setIsCreateOpen(false);
              setEditingWebhook(null);
              setFormData({ name: '', url: '', events: [] });
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingWebhook ? 'Editar Webhook' : 'Crear Webhook'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Mi webhook"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL del Endpoint
                  </label>
                  <Input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://tu-servidor.com/webhook"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Eventos
                  </label>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {Object.entries(eventsByCategory).map(([category, events]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {events.map((event) => (
                            <label
                              key={event.event}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                                formData.events.includes(event.event)
                                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                                  : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={formData.events.includes(event.event)}
                                onChange={() => toggleEvent(event.event)}
                                className="mt-1"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {event.event}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {event.description}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingWebhook(null);
                      setFormData({ name: '', url: '', events: [] });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingWebhook ? 'Guardar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando webhooks...</div>
      ) : webhooksData?.length === 0 ? (
        <Card className="p-12 text-center">
          <Webhook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay webhooks configurados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Crea tu primer webhook para recibir notificaciones de eventos
          </p>
          <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Crear Webhook
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooksData?.map((webhook) => (
            <Card key={webhook.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {webhook.name}
                      </h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          webhook.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        )}
                      >
                        {webhook.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.slice(0, 3).map((event) => (
                        <span
                          key={event}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded"
                        >
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                          +{webhook.events.length - 3} mas
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm mr-4">
                      <div className="text-green-600">{webhook.successCount} exitosos</div>
                      <div className="text-red-600">{webhook.failureCount} fallidos</div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(webhook)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (confirm('¿Eliminar este webhook?')) {
                          deleteMutation.mutate(webhook.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id)
                      }
                    >
                      {expandedWebhook === webhook.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Section */}
              <AnimatePresence>
                {expandedWebhook === webhook.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Historial de entregas
                        </h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => regenerateMutation.mutate(webhook.id)}
                          disabled={regenerateMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerar Secret
                        </Button>
                      </div>

                      {deliveriesData?.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No hay entregas registradas
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {deliveriesData?.map((delivery) => (
                            <div
                              key={delivery.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(delivery.status)}
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {delivery.event}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(delivery.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                {delivery.statusCode && (
                                  <div className="text-gray-600 dark:text-gray-400">
                                    HTTP {delivery.statusCode}
                                  </div>
                                )}
                                {delivery.responseTime && (
                                  <div className="text-gray-500">{delivery.responseTime}ms</div>
                                )}
                                {delivery.errorMessage && (
                                  <div className="text-red-500 text-xs truncate max-w-[200px]">
                                    {delivery.errorMessage}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
