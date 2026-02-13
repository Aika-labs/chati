import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  CalendarCheck,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Card, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface ReportStats {
  totalContacts: number;
  newContactsThisMonth: number;
  totalConversations: number;
  openConversations: number;
  totalMessages: number;
  messagesThisMonth: number;
  appointmentsThisMonth: number;
  completedAppointments: number;
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['report-stats', dateRange],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ReportStats }>(
        `/analytics/stats?from=${dateRange.from}&to=${dateRange.to}`
      );
      return res.data.data;
    },
  });

  // Generate CSV content
  const generateCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const value = row[h];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  // Download file helper
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export handlers
  const handleExportContacts = async () => {
    setIsExporting(true);
    try {
      const res = await api.get<{ success: boolean; data: { contacts: Record<string, unknown>[] } }>(
        '/contacts?limit=1000'
      );
      const contacts = res.data.data.contacts.map((c) => ({
        nombre: c.name || '',
        telefono: c.phone,
        email: c.email || '',
        primer_contacto: c.firstContactAt,
        ultimo_contacto: c.lastContactAt,
        total_mensajes: c.totalMessages || 0,
      }));
      generateCSV(contacts, `contactos_${dateRange.from}_${dateRange.to}`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportConversations = async () => {
    setIsExporting(true);
    try {
      const res = await api.get<{ success: boolean; data: { conversations: Record<string, unknown>[] } }>(
        '/conversations?limit=1000'
      );
      const conversations = res.data.data.conversations.map((c) => ({
        id: c.id,
        contacto: (c.contact as Record<string, unknown>)?.name || (c.contact as Record<string, unknown>)?.phone || '',
        estado: c.status,
        ia_activa: c.isAiEnabled ? 'Si' : 'No',
        ultimo_mensaje: c.lastMessageAt,
      }));
      generateCSV(conversations, `conversaciones_${dateRange.from}_${dateRange.to}`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAppointments = async () => {
    setIsExporting(true);
    try {
      const res = await api.get<{ success: boolean; data: { appointments: Record<string, unknown>[] } }>(
        `/appointments?from=${dateRange.from}&to=${dateRange.to}&limit=1000`
      );
      const appointments = res.data.data.appointments.map((a) => ({
        titulo: a.title,
        contacto: (a.contact as Record<string, unknown>)?.name || '',
        fecha: a.scheduledAt,
        duracion_min: a.duration,
        estado: a.status,
        servicio: (a.service as Record<string, unknown>)?.name || '',
      }));
      generateCSV(appointments, `citas_${dateRange.from}_${dateRange.to}`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = () => {
    if (!stats) return;

    const summary = [
      {
        metrica: 'Total Contactos',
        valor: stats.totalContacts,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Nuevos Contactos (mes)',
        valor: stats.newContactsThisMonth,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Total Conversaciones',
        valor: stats.totalConversations,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Conversaciones Abiertas',
        valor: stats.openConversations,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Total Mensajes',
        valor: stats.totalMessages,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Mensajes (mes)',
        valor: stats.messagesThisMonth,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Citas (mes)',
        valor: stats.appointmentsThisMonth,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
      {
        metrica: 'Citas Completadas',
        valor: stats.completedAppointments,
        periodo: `${dateRange.from} - ${dateRange.to}`,
      },
    ];

    generateCSV(summary, `resumen_${dateRange.from}_${dateRange.to}`);
  };

  const statCards = [
    {
      title: 'Contactos',
      value: stats?.totalContacts || 0,
      change: stats?.newContactsThisMonth || 0,
      changeLabel: 'nuevos este mes',
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Conversaciones',
      value: stats?.totalConversations || 0,
      change: stats?.openConversations || 0,
      changeLabel: 'abiertas',
      icon: MessageSquare,
      color: 'green',
    },
    {
      title: 'Mensajes',
      value: stats?.totalMessages || 0,
      change: stats?.messagesThisMonth || 0,
      changeLabel: 'este mes',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      title: 'Citas',
      value: stats?.appointmentsThisMonth || 0,
      change: stats?.completedAppointments || 0,
      changeLabel: 'completadas',
      icon: CalendarCheck,
      color: 'orange',
    },
  ];

  const exportOptions = [
    {
      title: 'Resumen General',
      description: 'Metricas principales del periodo',
      icon: FileText,
      onClick: handleExportSummary,
    },
    {
      title: 'Contactos',
      description: 'Lista completa de contactos',
      icon: Users,
      onClick: handleExportContacts,
    },
    {
      title: 'Conversaciones',
      description: 'Historial de conversaciones',
      icon: MessageSquare,
      onClick: handleExportConversations,
    },
    {
      title: 'Citas',
      description: 'Agenda de citas del periodo',
      icon: Calendar,
      onClick: handleExportAppointments,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reportes y Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analiza el rendimiento y exporta datos de tu negocio
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Periodo:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Desde:</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hasta:</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-40"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    stat.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
                    stat.color === 'green' && 'bg-green-100 dark:bg-green-900/30 text-green-600',
                    stat.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
                    stat.color === 'orange' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                  )}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {isLoading ? '...' : stat.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</div>
              <div className="mt-2 text-sm">
                <span className="text-primary-600 font-medium">{stat.change}</span>
                <span className="text-gray-500 ml-1">{stat.changeLabel}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Export Options */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Exportar Datos
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {exportOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <button
                onClick={option.onClick}
                className="w-full text-left"
              >
                <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                      <option.icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                    <FileSpreadsheet className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Export All Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleExportSummary}
          disabled={isExporting || isLoading}
          leftIcon={<Download className="w-5 h-5" />}
        >
          {isExporting ? 'Exportando...' : 'Descargar Resumen CSV'}
        </Button>
      </div>
    </div>
  );
}
