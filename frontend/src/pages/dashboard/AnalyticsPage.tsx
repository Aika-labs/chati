import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  MessageSquare,
  Users,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Bot,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface AnalyticsData {
  overview: {
    totalMessages: number;
    messagesChange: number;
    totalConversations: number;
    conversationsChange: number;
    totalContacts: number;
    contactsChange: number;
    totalAppointments: number;
    appointmentsChange: number;
  };
  messagesByDay: Array<{ date: string; inbound: number; outbound: number }>;
  conversationsByStatus: Array<{ status: string; count: number }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  topHours: Array<{ hour: string; messages: number }>;
  aiVsHuman: { ai: number; human: number };
  responseTime: { average: number; median: number };
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Helper to generate initial date range
const getInitialDateRange = () => {
  const now = Date.now();
  return {
    from: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date(now).toISOString().split('T')[0],
  };
};

// Generate mock data outside component to avoid impure function calls during render
const generateMockMessagesByDay = () => {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(now - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    inbound: Math.floor(Math.random() * 200) + 100,
    outbound: Math.floor(Math.random() * 150) + 80,
  }));
};

const generateMockTopHours = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    messages: Math.floor(Math.random() * 100) + (i >= 9 && i <= 18 ? 50 : 10),
  }));
};

// Pre-generate mock data
const MOCK_MESSAGES_BY_DAY = generateMockMessagesByDay();
const MOCK_TOP_HOURS = generateMockTopHours();

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  // Fetch analytics data
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AnalyticsData }>(
        `/analytics/dashboard?from=${dateRange.from}&to=${dateRange.to}`
      );
      return res.data.data;
    },
  });

  // Mock data for demo (replace with real API data)
  const mockData: AnalyticsData = data || {
    overview: {
      totalMessages: 12847,
      messagesChange: 12.5,
      totalConversations: 1234,
      conversationsChange: 8.3,
      totalContacts: 567,
      contactsChange: 15.2,
      totalAppointments: 89,
      appointmentsChange: -3.1,
    },
    messagesByDay: MOCK_MESSAGES_BY_DAY,
    conversationsByStatus: [
      { status: 'Abiertas', count: 45 },
      { status: 'Cerradas', count: 120 },
      { status: 'Archivadas', count: 35 },
    ],
    appointmentsByStatus: [
      { status: 'Programadas', count: 25 },
      { status: 'Confirmadas', count: 18 },
      { status: 'Completadas', count: 42 },
      { status: 'Canceladas', count: 4 },
    ],
    topHours: MOCK_TOP_HOURS,
    aiVsHuman: { ai: 78, human: 22 },
    responseTime: { average: 45, median: 32 },
  };

  const statCards = [
    {
      title: 'Mensajes Totales',
      value: mockData.overview.totalMessages.toLocaleString(),
      change: mockData.overview.messagesChange,
      icon: MessageSquare,
      color: 'blue',
    },
    {
      title: 'Conversaciones',
      value: mockData.overview.totalConversations.toLocaleString(),
      change: mockData.overview.conversationsChange,
      icon: Users,
      color: 'green',
    },
    {
      title: 'Contactos',
      value: mockData.overview.totalContacts.toLocaleString(),
      change: mockData.overview.contactsChange,
      icon: TrendingUp,
      color: 'purple',
    },
    {
      title: 'Citas',
      value: mockData.overview.totalAppointments.toLocaleString(),
      change: mockData.overview.appointmentsChange,
      icon: CalendarCheck,
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Metricas detalladas de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-36"
          />
          <span className="text-gray-500">a</span>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-36"
          />
        </div>
      </div>

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
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {stat.change >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {isLoading ? '...' : stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Messages Over Time */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mensajes por Dia
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData.messagesByDay}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: '#9ca3af' }} />
                <YAxis className="text-xs" tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #e5e7eb)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Entrantes"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Salientes"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorOutbound)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Peak Hours */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Horas Pico
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData.topHours}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="hour" className="text-xs" tick={{ fill: '#9ca3af' }} interval={2} />
                <YAxis className="text-xs" tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid var(--tooltip-border, #e5e7eb)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="messages" name="Mensajes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversations by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Conversaciones por Estado
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData.conversationsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {mockData.conversationsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Appointments by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Citas por Estado
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData.appointmentsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {mockData.appointmentsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI vs Human */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Respuestas IA vs Humano
          </h3>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Bot className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockData.aiVsHuman.ai}%
                  </div>
                  <div className="text-sm text-gray-500">IA</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mockData.aiVsHuman.human}%
                  </div>
                  <div className="text-sm text-gray-500">Humano</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-primary-600 h-4 rounded-full"
                  style={{ width: `${mockData.aiVsHuman.ai}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Response Time Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tiempo de Respuesta
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Promedio: <span className="font-semibold text-gray-900 dark:text-white">{mockData.responseTime.average}s</span>
              {' | '}
              Mediana: <span className="font-semibold text-gray-900 dark:text-white">{mockData.responseTime.median}s</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
