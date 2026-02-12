import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  MoreHorizontal,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Button, Avatar, Badge, Card } from '../../components/ui';
import { cn, formatDate, formatPhone } from '../../lib/utils';
import type { Contact, Tag } from '../../types';

// Mock data
const mockTags: Tag[] = [
  { id: '1', name: 'VIP', color: 'yellow' },
  { id: '2', name: 'Nuevo', color: 'green' },
  { id: '3', name: 'Interesado', color: 'blue' },
  { id: '4', name: 'Seguimiento', color: 'purple' },
  { id: '5', name: 'Inactivo', color: 'gray' },
];

const mockContacts: Contact[] = [
  { id: '1', phone: '+525512345678', name: 'María García', email: 'maria@email.com', score: 95, tags: [mockTags[0]!, mockTags[2]!], firstContactAt: '2024-01-15', lastContactAt: '2024-02-10', totalMessages: 156, notes: 'Cliente frecuente' },
  { id: '2', phone: '+525587654321', name: 'Carlos López', email: 'carlos@email.com', score: 72, tags: [mockTags[1]!], firstContactAt: '2024-02-01', lastContactAt: '2024-02-09', totalMessages: 23, notes: '' },
  { id: '3', phone: '+525598765432', name: 'Ana Martínez', email: 'ana@email.com', score: 88, tags: [mockTags[2]!, mockTags[3]!], firstContactAt: '2024-01-20', lastContactAt: '2024-02-08', totalMessages: 67, notes: 'Prefiere citas por la tarde' },
  { id: '4', phone: '+525511223344', name: 'Roberto Sánchez', email: 'roberto@email.com', score: 45, tags: [mockTags[4]!], firstContactAt: '2023-12-10', lastContactAt: '2024-01-15', totalMessages: 12, notes: '' },
  { id: '5', phone: '+525544332211', name: 'Laura Hernández', email: 'laura@email.com', score: 82, tags: [mockTags[0]!, mockTags[3]!], firstContactAt: '2024-01-05', lastContactAt: '2024-02-10', totalMessages: 89, notes: 'Referida por María García' },
  { id: '6', phone: '+525566778899', name: 'Miguel Torres', email: 'miguel@email.com', score: 68, tags: [mockTags[1]!, mockTags[2]!], firstContactAt: '2024-02-05', lastContactAt: '2024-02-10', totalMessages: 34, notes: '' },
];

const tagColors: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-800',
  red: 'bg-red-100 text-red-800',
};

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger';
  return <Badge variant={variant}>{score}</Badge>;
}

export function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      contact.tags.some(tag => selectedTags.includes(tag.id));
    
    return matchesSearch && matchesTags;
  });

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col', selectedContact && 'lg:mr-96')}>
        <Header title="Contactos" subtitle={`${filteredContacts.length} contactos`} />
        
        <div className="p-6 space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button
                variant="secondary"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && 'bg-primary-50 border-primary-200')}
              >
                Filtros
                {selectedTags.length > 0 && (
                  <span className="ml-2 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedTags.length}
                  </span>
                )}
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                Exportar
              </Button>
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                Nuevo Contacto
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Filtrar por etiquetas</span>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {mockTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      selectedTags.includes(tag.id)
                        ? 'ring-2 ring-primary-500 ring-offset-2'
                        : '',
                      tagColors[tag.color || 'gray']
                    )}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Table */}
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Etiquetas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensajes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último contacto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedContacts.map(contact => (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={cn(
                        'hover:bg-gray-50 cursor-pointer transition-colors',
                        selectedContact?.id === contact.id && 'bg-primary-50'
                      )}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={contact.name} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatPhone(contact.phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {contact.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag.id}
                              className={cn('px-2 py-0.5 rounded-full text-xs font-medium', tagColors[tag.color || 'gray'])}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {contact.tags.length > 2 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              +{contact.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ScoreBadge score={contact.score} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contact.totalMessages}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contact.lastContactAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreHorizontal className="w-5 h-5 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredContacts.length)} de {filteredContacts.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Contact Detail Sidebar */}
      {selectedContact && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-gray-200 shadow-xl z-30 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Detalle del Contacto</h3>
              <button
                onClick={() => setSelectedContact(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Profile */}
            <div className="text-center mb-6">
              <Avatar name={selectedContact.name} size="xl" className="mx-auto mb-3" />
              <h4 className="text-xl font-semibold text-gray-900">{selectedContact.name}</h4>
              <p className="text-gray-500">{formatPhone(selectedContact.phone)}</p>
              <div className="flex justify-center gap-2 mt-3">
                {selectedContact.tags.map(tag => (
                  <span
                    key={tag.id}
                    className={cn('px-2 py-1 rounded-full text-xs font-medium', tagColors[tag.color || 'gray'])}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <MessageSquare className="w-5 h-5 text-primary-600 mb-1" />
                <span className="text-xs text-gray-600">Mensaje</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <Phone className="w-5 h-5 text-green-600 mb-1" />
                <span className="text-xs text-gray-600">Llamar</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <Calendar className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-xs text-gray-600">Agendar</span>
              </button>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{selectedContact.email || '-'}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Score de Engagement</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        selectedContact.score >= 80 ? 'bg-green-500' : selectedContact.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${selectedContact.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{selectedContact.score}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Primer Contacto</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(selectedContact.firstContactAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Último Contacto</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(selectedContact.lastContactAt)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Total de Mensajes</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.totalMessages}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Notas</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.notes || 'Sin notas'}</p>
              </div>
            </div>

            {/* Tags Management */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-gray-500 uppercase">Etiquetas</label>
                <button className="text-xs text-primary-600 hover:text-primary-700">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedContact.tags.map(tag => (
                  <span
                    key={tag.id}
                    className={cn('px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1', tagColors[tag.color || 'gray'])}
                  >
                    {tag.name}
                    <button className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
