import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search,
  File,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Card, CardTitle, Input, Badge } from '../../components/ui';
import { api } from '../../lib/api';

interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL' | 'CSV' | 'TEXT';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileSize: number;
  pageCount?: number;
  chunkCount?: number;
  createdAt: string;
  processedAt?: string;
}

const statusConfig = {
  PENDING: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Pendiente' },
  PROCESSING: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Procesando' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Completado' },
  FAILED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Error' },
};

const typeIcons = {
  PDF: FileText,
  EXCEL: FileSpreadsheet,
  CSV: FileSpreadsheet,
  TEXT: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Document[] }>('/rag/documents');
      return response.data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/rag/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Tipo de archivo no soportado. Usa PDF, Excel, CSV o TXT.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo es muy grande. Máximo 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      setUploadError(err.response?.data?.error?.message ?? 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'COMPLETED').length,
    processing: documents.filter(d => d.status === 'PROCESSING' || d.status === 'PENDING').length,
    failed: documents.filter(d => d.status === 'FAILED').length,
  };

  return (
    <div>
      <Header 
        title="Documentos" 
        subtitle="Sube documentos para que la IA pueda consultarlos"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-sm text-gray-500">Procesados</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
                <p className="text-sm text-gray-500">En proceso</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                <p className="text-sm text-gray-500">Con error</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Subir Documento</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Formatos soportados: PDF, Excel (.xlsx), CSV, TXT. Máximo 10MB.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <span className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 px-4 py-2 text-sm cursor-pointer">
                  {isUploading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                </span>
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}
        </Card>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar documentos..."
              leftIcon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Documents List */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-100">
            <CardTitle>Mis Documentos</CardTitle>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Cargando documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">
                {searchQuery ? 'No se encontraron documentos' : 'No hay documentos aún'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Sube tu primer documento para que la IA pueda consultarlo
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => {
                const TypeIcon = typeIcons[doc.type];
                const status = statusConfig[doc.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={doc.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-100 rounded-xl">
                          <TypeIcon className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{doc.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            {doc.pageCount && <span>{doc.pageCount} páginas</span>}
                            {doc.chunkCount && <span>{doc.chunkCount} fragmentos</span>}
                            <span>{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={`${status.bg} ${status.color}`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este documento?')) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex gap-4">
            <div className="p-2 bg-blue-100 rounded-lg h-fit">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">¿Cómo funciona?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Los documentos que subas serán procesados y divididos en fragmentos. 
                Cuando un cliente pregunte algo, la IA buscará información relevante 
                en tus documentos para dar respuestas más precisas sobre tu negocio, 
                productos y servicios.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
