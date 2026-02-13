import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Copy, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Card } from '../../components/ui';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  industry: string | null;
  content: string;
  variables: string[];
  isGlobal: boolean;
  usageCount: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const categoryColors: Record<string, string> = {
  GREETING: 'bg-green-100 text-green-700',
  APPOINTMENT: 'bg-blue-100 text-blue-700',
  PRICING: 'bg-purple-100 text-purple-700',
  HOURS: 'bg-orange-100 text-orange-700',
  LOCATION: 'bg-pink-100 text-pink-700',
  THANKS: 'bg-yellow-100 text-yellow-700',
  GOODBYE: 'bg-red-100 text-red-700',
  FAQ: 'bg-cyan-100 text-cyan-700',
  PROMOTION: 'bg-indigo-100 text-indigo-700',
  CUSTOM: 'bg-gray-100 text-gray-700',
};

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?category=${selectedCategory}` : '';
      const res = await api.get<{ success: boolean; data: Template[] }>(
        `/templates${params}`
      );
      return res.data.data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['template-categories'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Category[] }>(
        '/templates/categories'
      );
      return res.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Copy to clipboard
  const handleCopy = async (template: Template) => {
    await navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Track usage
    api.post(`/templates/${template.id}/use`);
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Templates de Respuesta
          </h1>
          <p className="text-gray-600 mt-1">
            Respuestas predefinidas para agilizar tu comunicacion
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Crear Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              !selectedCategory
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No se encontraron templates</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 h-full flex flex-col hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {template.name}
                      </h3>
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                          categoryColors[template.category] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {categories.find((c) => c.id === template.category)?.name ||
                          template.category}
                      </span>
                    </div>
                    {template.isGlobal && (
                      <span className="text-xs text-gray-400">Global</span>
                    )}
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-gray-600 flex-1 line-clamp-3 mb-4">
                    {template.content}
                  </p>

                  {/* Variables */}
                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Usado {template.usageCount} veces
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(template)}
                        className="p-2"
                      >
                        {copiedId === template.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {!template.isGlobal && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(template.id)}
                            className="p-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(template.id)}
                            className="p-2 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal would go here */}
      {(isCreating || editingId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? 'Editar Template' : 'Crear Template'}
              </h2>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-center py-8">
              Formulario de creacion/edicion proximamente
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}
            >
              Cerrar
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
