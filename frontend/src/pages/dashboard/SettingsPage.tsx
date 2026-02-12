import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings,
  MessageCircle,
  Calendar,
  FileSpreadsheet,
  Link2,
  Unlink,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Smartphone,
  Bell,
  Shield
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Card, CardTitle, Button, Input, Badge } from '../../components/ui';
import { api } from '../../lib/api';

interface TenantSettings {
  id: string;
  name: string;
  businessName: string | null;
  whatsappNumber: string | null;
  whatsappVerified: boolean;
  googleCalendarId: string | null;
  googleSheetId: string | null;
  googleRefreshToken: string | null;
  webhookUrl: string | null;
  timezone: string;
  language: string;
}

interface IntegrationStatus {
  whatsapp: boolean;
  googleCalendar: boolean;
  googleSheets: boolean;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for connection success from OAuth callback
  const connected = searchParams.get('connected');
  useEffect(() => {
    if (connected === 'calendar') {
      const timer = setTimeout(() => {
        setSuccessMessage('Google Calendar conectado exitosamente');
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 0);
      return () => clearTimeout(timer);
    } else if (connected === 'sheets') {
      const timer = setTimeout(() => {
        setSuccessMessage('Google Sheets conectado exitosamente');
        setTimeout(() => setSuccessMessage(''), 5000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [connected]);

  // Fetch tenant settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { tenant: TenantSettings } }>('/auth/me');
      return response.data.data.tenant;
    },
  });

  // Derive integration status
  const integrations: IntegrationStatus = {
    whatsapp: !!settings?.whatsappVerified,
    googleCalendar: !!settings?.googleCalendarId,
    googleSheets: !!settings?.googleSheetId,
  };

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    whatsappNumber: '',
    timezone: 'America/Mexico_City',
    language: 'es',
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      const timer = setTimeout(() => {
        setFormData({
          businessName: settings.businessName ?? '',
          whatsappNumber: settings.whatsappNumber ?? '',
          timezone: settings.timezone ?? 'America/Mexico_City',
          language: settings.language ?? 'es',
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.patch('/tenant/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      setSuccessMessage('Configuración guardada');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Copy webhook URL
  const copyWebhookUrl = () => {
    if (settings?.webhookUrl) {
      navigator.clipboard.writeText(settings.webhookUrl);
      setSuccessMessage('URL copiada al portapapeles');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Connect Google Calendar
  const connectGoogleCalendar = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/auth/google/calendar`;
  };

  // Connect Google Sheets
  const connectGoogleSheets = () => {
    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/auth/google/sheets`;
  };

  if (isLoading) {
    return (
      <div>
        <Header title="Configuración" subtitle="Administra tu cuenta y conexiones" />
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-500 mt-2">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Configuración" 
        subtitle="Administra tu cuenta y conexiones"
      />

      <div className="p-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {/* Business Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <CardTitle>Información del Negocio</CardTitle>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Negocio
              </label>
              <Input
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Mi Negocio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zona Horaria
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                <option value="America/Monterrey">Monterrey (GMT-6)</option>
                <option value="America/Tijuana">Tijuana (GMT-8)</option>
                <option value="America/Cancun">Cancún (GMT-5)</option>
                <option value="America/Bogota">Bogotá (GMT-5)</option>
                <option value="America/Lima">Lima (GMT-5)</option>
                <option value="America/Santiago">Santiago (GMT-4)</option>
                <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                <option value="Europe/Madrid">Madrid (GMT+1)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idioma
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              leftIcon={<Save className="w-4 h-4" />}
              onClick={() => saveMutation.mutate(formData)}
              isLoading={saveMutation.isPending}
            >
              Guardar Cambios
            </Button>
          </div>
        </Card>

        {/* WhatsApp Integration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>WhatsApp Business</CardTitle>
                <p className="text-sm text-gray-500">Conecta tu número de WhatsApp</p>
              </div>
            </div>
            <Badge className={integrations.whatsapp ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
              {integrations.whatsapp ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  No conectado
                </>
              )}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de WhatsApp
              </label>
              <div className="flex gap-3">
                <Input
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+52 55 1234 5678"
                  leftIcon={<Smartphone className="w-5 h-5" />}
                  className="flex-1"
                />
                <Button variant="outline">
                  Verificar
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Ingresa tu número con código de país. Recibirás un código de verificación.
              </p>
            </div>

            {settings?.webhookUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL (para Meta Business)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={showWebhookSecret ? settings.webhookUrl : '••••••••••••••••••••'}
                      readOnly
                      className="pr-20 font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyWebhookUrl}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Usa esta URL en la configuración de tu app de Meta Business.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Google Calendar Integration */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <p className="text-sm text-gray-500">
                  {integrations.googleCalendar 
                    ? `Calendario: ${settings?.googleCalendarId ?? 'primary'}`
                    : 'Sincroniza citas con tu calendario'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={integrations.googleCalendar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                {integrations.googleCalendar ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    No conectado
                  </>
                )}
              </Badge>
              {integrations.googleCalendar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Unlink className="w-4 h-4" />}
                >
                  Desconectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  leftIcon={<Link2 className="w-4 h-4" />}
                  onClick={connectGoogleCalendar}
                >
                  Conectar
                </Button>
              )}
            </div>
          </div>

          {integrations.googleCalendar && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Las citas agendadas por el chatbot se sincronizarán automáticamente con tu Google Calendar.
              </p>
            </div>
          )}
        </Card>

        {/* Google Sheets Integration */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Google Sheets</CardTitle>
                <p className="text-sm text-gray-500">
                  {integrations.googleSheets 
                    ? 'Hoja conectada para productos y servicios'
                    : 'Gestiona precios desde una hoja de cálculo'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={integrations.googleSheets ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                {integrations.googleSheets ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    No conectado
                  </>
                )}
              </Badge>
              {integrations.googleSheets ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ExternalLink className="w-4 h-4" />}
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${settings?.googleSheetId}`, '_blank')}
                >
                  Abrir
                </Button>
              ) : (
                <Button
                  size="sm"
                  leftIcon={<Link2 className="w-4 h-4" />}
                  onClick={connectGoogleSheets}
                >
                  Conectar
                </Button>
              )}
            </div>
          </div>

          {integrations.googleSheets && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Ve a la página de Productos para importar/exportar datos desde tu hoja de Google Sheets.
              </p>
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <CardTitle>Notificaciones</CardTitle>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Nuevas conversaciones</p>
                <p className="text-sm text-gray-500">Recibe alertas cuando un cliente inicie una conversación</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-blue-600" />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Citas agendadas</p>
                <p className="text-sm text-gray-500">Notificaciones cuando se agende una nueva cita</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-blue-600" />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Resumen diario</p>
                <p className="text-sm text-gray-500">Recibe un resumen de actividad cada día</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded text-blue-600" />
            </label>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <CardTitle>Seguridad</CardTitle>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Cambiar contraseña</p>
                <p className="text-sm text-gray-500">Actualiza tu contraseña de acceso</p>
              </div>
              <Button variant="outline" size="sm">
                Cambiar
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Sesiones activas</p>
                <p className="text-sm text-gray-500">Administra los dispositivos conectados</p>
              </div>
              <Button variant="outline" size="sm">
                Ver sesiones
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-red-900">Eliminar cuenta</p>
                <p className="text-sm text-red-600">Esta acción es irreversible</p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100">
                Eliminar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
