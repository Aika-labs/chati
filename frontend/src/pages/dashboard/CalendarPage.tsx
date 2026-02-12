import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MoreHorizontal,
  Check,
  X as XIcon
} from 'lucide-react';
import { Header } from '../../components/layout';
import { Button, Card, Badge, Avatar } from '../../components/ui';
import { cn } from '../../lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  contact: { name: string; phone: string };
  service?: string;
  date: Date;
  time: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

const mockAppointments: Appointment[] = [
  { id: '1', title: 'Consulta', contact: { name: 'María García', phone: '+525512345678' }, service: 'Consulta General', date: new Date(), time: '10:00', duration: 60, status: 'CONFIRMED' },
  { id: '2', title: 'Seguimiento', contact: { name: 'Carlos López', phone: '+525587654321' }, service: 'Seguimiento', date: new Date(), time: '14:30', duration: 30, status: 'SCHEDULED' },
  { id: '3', title: 'Primera cita', contact: { name: 'Ana Martínez', phone: '+525598765432' }, service: 'Evaluación', date: addDays(new Date(), 1), time: '09:00', duration: 90, status: 'SCHEDULED' },
  { id: '4', title: 'Revisión', contact: { name: 'Roberto Sánchez', phone: '+525511223344' }, service: 'Revisión', date: addDays(new Date(), 2), time: '11:00', duration: 45, status: 'CONFIRMED' },
];

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDate = (date: Date) => {
    return mockAppointments.filter(apt => isSameDay(apt.date, date));
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  return (
    <div>
      <Header title="Calendario" subtitle="Gestiona tus citas" />
      
      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const dayAppointments = getAppointmentsForDate(d);
                  const isToday = isSameDay(d, new Date());
                  const isSelected = isSameDay(d, selectedDate);
                  const isCurrentMonth = isSameMonth(d, currentMonth);

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className={cn(
                        'aspect-square p-1 rounded-lg transition-colors relative',
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                        isSelected && 'bg-primary-100 ring-2 ring-primary-500',
                        !isSelected && 'hover:bg-gray-100'
                      )}
                    >
                      <span
                        className={cn(
                          'w-7 h-7 flex items-center justify-center rounded-full text-sm',
                          isToday && !isSelected && 'bg-primary-600 text-white'
                        )}
                      >
                        {format(d, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayAppointments.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Selected Date Appointments */}
          <div>
            <Card padding="none">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedDateAppointments.length} citas
                  </p>
                </div>
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Nueva
                </Button>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {selectedDateAppointments.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No hay citas para este día</p>
                  </div>
                ) : (
                  selectedDateAppointments.map(apt => (
                    <div key={apt.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-10 bg-primary-500 rounded-full" />
                          <div>
                            <div className="font-medium text-gray-900">{apt.time}</div>
                            <div className="text-sm text-gray-500">{apt.duration} min</div>
                          </div>
                        </div>
                        <Badge className={statusColors[apt.status]}>
                          {statusLabels[apt.status]}
                        </Badge>
                      </div>
                      <div className="ml-3 pl-3 border-l-2 border-gray-100">
                        <div className="font-medium text-gray-900">{apt.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar name={apt.contact.name} size="xs" />
                          <span className="text-sm text-gray-600">{apt.contact.name}</span>
                        </div>
                        {apt.service && (
                          <div className="text-sm text-gray-500 mt-1">{apt.service}</div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button variant="ghost" size="sm">
                            <Check className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <XIcon className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Upcoming Appointments List */}
        <Card className="mt-6" padding="none">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Próximas Citas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockAppointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(apt.date, "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {apt.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={apt.contact.name} size="sm" />
                        <span className="text-sm text-gray-900">{apt.contact.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {apt.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusColors[apt.status]}>
                        {statusLabels[apt.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
