import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2,
  Search,
  ExternalLink,
  RefreshCw,
  Upload,
  Download,
  Link2,
  Unlink,
  FileSpreadsheet,
  Clock,
  DollarSign,
  Tag
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Card, CardTitle, Button, Input, Badge } from '../../components/ui';
import { api } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

interface SheetInfo {
  id: string;
  name: string;
  url: string;
}

interface SyncResult {
  products: number;
  services: number;
  errors: string[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(price);
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState('');

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Product[] }>('/knowledge/products');
      return response.data.data;
    },
  });

  // Fetch services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Service[] }>('/knowledge/services');
      return response.data.data;
    },
  });

  // Fetch sheet info
  const { data: sheetInfo, isLoading: loadingSheet } = useQuery({
    queryKey: ['sheets-info'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: SheetInfo | null }>('/knowledge/sheets');
      return response.data.data;
    },
  });

  // Connect sheet mutation
  const connectMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      const response = await api.post<{ success: boolean; data: { name: string } }>('/knowledge/sheets/connect', { sheetId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets-info'] });
      setShowConnectModal(false);
      setSheetIdInput('');
    },
  });

  // Disconnect sheet mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.post('/knowledge/sheets/disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets-info'] });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ success: boolean; data: { sheetId: string; url: string } }>('/knowledge/sheets/create');
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sheets-info'] });
      window.open(data.url, '_blank');
    },
  });

  // Sync from sheet mutation
  const syncFromMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ success: boolean; data: SyncResult }>('/knowledge/sheets/sync');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Push to sheet mutation
  const pushToMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ success: boolean; data: SyncResult }>('/knowledge/sheets/push');
      return response.data.data;
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/knowledge/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await api.delete(`/knowledge/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Filter items
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingProducts || loadingServices || loadingSheet;

  return (
    <div>
      <Header 
        title="Productos y Servicios" 
        subtitle="Gestiona tu catálogo y sincroniza con Google Sheets"
      />

      <div className="p-6 space-y-6">
        {/* Google Sheets Integration */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Google Sheets</h3>
                {sheetInfo ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{sheetInfo.name}</span>
                    <a
                      href={sheetInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay hoja conectada</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sheetInfo ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => syncFromMutation.mutate()}
                    isLoading={syncFromMutation.isPending}
                  >
                    Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => pushToMutation.mutate()}
                    isLoading={pushToMutation.isPending}
                  >
                    Exportar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Unlink className="w-4 h-4" />}
                    onClick={() => {
                      if (confirm('¿Desconectar Google Sheets?')) {
                        disconnectMutation.mutate();
                      }
                    }}
                    isLoading={disconnectMutation.isPending}
                  >
                    Desconectar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Link2 className="w-4 h-4" />}
                    onClick={() => setShowConnectModal(true)}
                  >
                    Conectar Hoja
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => createTemplateMutation.mutate()}
                    isLoading={createTemplateMutation.isPending}
                  >
                    Crear Nueva
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Sync results */}
          {(syncFromMutation.isSuccess || pushToMutation.isSuccess) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Sincronización completada: {' '}
                {syncFromMutation.data?.products ?? pushToMutation.data?.products ?? 0} productos, {' '}
                {syncFromMutation.data?.services ?? pushToMutation.data?.services ?? 0} servicios
              </p>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos ({products.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'services'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Servicios ({services.length})
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder={`Buscar ${activeTab === 'products' ? 'productos' : 'servicios'}...`}
              leftIcon={<Search className="w-5 h-5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : activeTab === 'products' ? (
          /* Products Grid */
          filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">
                {searchQuery ? 'No se encontraron productos' : 'No hay productos aún'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Importa desde Google Sheets o agrega productos manualmente
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className="bg-green-100 text-green-700">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatPrice(product.price)}
                        </Badge>
                        {product.category && (
                          <Badge className="bg-gray-100 text-gray-600">
                            <Tag className="w-3 h-3 mr-1" />
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este producto?')) {
                            deleteProductMutation.mutate(product.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          /* Services List */
          filteredServices.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">
                {searchQuery ? 'No se encontraron servicios' : 'No hay servicios aún'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Importa desde Google Sheets o agrega servicios manualmente
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <Card key={service.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-500 mt-0.5">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className="bg-green-100 text-green-700">
                            {formatPrice(service.price)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este servicio?')) {
                            deleteServiceMutation.mutate(service.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Connect Sheet Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 m-4">
            <CardTitle>Conectar Google Sheet</CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              Ingresa el ID de tu hoja de Google Sheets. Lo puedes encontrar en la URL:
              <br />
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
              </code>
            </p>
            <div className="mt-4">
              <Input
                placeholder="ID de la hoja"
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConnectModal(false);
                  setSheetIdInput('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => connectMutation.mutate(sheetIdInput)}
                isLoading={connectMutation.isPending}
                disabled={!sheetIdInput.trim()}
              >
                Conectar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
