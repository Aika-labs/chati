import { 
  MessageSquare, 
  Users, 
  Calendar, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Card, CardTitle, Badge } from '../../components/ui';

const stats = [
  {
    label: 'Conversaciones Activas',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    label: 'Contactos Totales',
    value: '1,234',
    change: '+8%',
    trend: 'up',
    icon: Users,
    color: 'bg-green-500',
  },
  {
    label: 'Citas Esta Semana',
    value: '18',
    change: '-3%',
    trend: 'down',
    icon: Calendar,
    color: 'bg-purple-500',
  },
  {
    label: 'Tasa de Respuesta',
    value: '98%',
    change: '+2%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-orange-500',
  },
];

const recentConversations = [
  { name: 'María García', message: '¿Cuánto cuesta el servicio?', time: '2m', unread: true },
  { name: 'Carlos López', message: 'Gracias por la información', time: '15m', unread: false },
  { name: 'Ana Martínez', message: 'Quiero agendar una cita', time: '1h', unread: true },
  { name: 'Roberto Sánchez', message: 'Perfecto, nos vemos mañana', time: '2h', unread: false },
];

const upcomingAppointments = [
  { name: 'María García', service: 'Consulta', time: '10:00 AM', date: 'Hoy' },
  { name: 'Juan Pérez', service: 'Seguimiento', time: '2:30 PM', date: 'Hoy' },
  { name: 'Laura Hernández', service: 'Primera cita', time: '9:00 AM', date: 'Mañana' },
];

export function DashboardHome() {
  return (
    <div>
      <Header title="Dashboard" subtitle="Resumen de tu negocio" />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Usage Bar */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Zap className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <CardTitle>Uso de Mensajes</CardTitle>
                <p className="text-sm text-gray-500">187 de 250 mensajes usados hoy</p>
              </div>
            </div>
            <Badge variant="warning">75%</Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-primary-600 h-3 rounded-full" style={{ width: '75%' }} />
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <Card padding="none">
            <div className="p-6 border-b border-gray-100">
              <CardTitle>Conversaciones Recientes</CardTitle>
            </div>
            <div className="divide-y divide-gray-100">
              {recentConversations.map((conv, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
                        {conv.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{conv.name}</span>
                          {conv.unread && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">{conv.message}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Ver todas las conversaciones →
              </button>
            </div>
          </Card>

          {/* Upcoming Appointments */}
          <Card padding="none">
            <div className="p-6 border-b border-gray-100">
              <CardTitle>Próximas Citas</CardTitle>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingAppointments.map((apt, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{apt.name}</span>
                        <p className="text-sm text-gray-500">{apt.service}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{apt.time}</div>
                      <div className="text-xs text-gray-500">{apt.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Ver calendario completo →
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
