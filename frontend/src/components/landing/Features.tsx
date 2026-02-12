import { 
  MessageSquare, 
  Brain, 
  Calendar, 
  Users, 
  FileText, 
  BarChart3,
  Zap,
  Shield
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Business API',
    description: 'Conecta tu número de WhatsApp Business y gestiona todas las conversaciones desde un solo lugar.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Brain,
    title: 'IA Conversacional',
    description: 'Respuestas automáticas inteligentes con LLaMA 3.3. Detecta intenciones y responde como un humano.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: FileText,
    title: 'Base de Conocimiento',
    description: 'Sube PDFs, Excel o conecta Google Sheets. La IA aprende de tu información para responder mejor.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Calendar,
    title: 'Agenda de Citas',
    description: 'Tus clientes pueden agendar citas directamente por WhatsApp. Sincroniza con Google Calendar.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description: 'Gestiona contactos, etiquetas, notas y todo el historial de conversaciones en un solo lugar.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics en Tiempo Real',
    description: 'Métricas de conversaciones, tiempos de respuesta, satisfacción y más. Todo en tu dashboard.',
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    icon: Zap,
    title: 'Respuestas Instantáneas',
    description: 'Responde en segundos, 24/7. Nunca pierdas un cliente por no contestar a tiempo.',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    icon: Shield,
    title: 'Seguridad Enterprise',
    description: 'Datos encriptados, multi-tenant aislado, cumplimiento GDPR y backups automáticos.',
    color: 'bg-red-100 text-red-600',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Todo lo que necesitas para{' '}
            <span className="text-gradient">automatizar tu negocio</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Una plataforma completa para gestionar tu comunicación con clientes, 
            potenciada por inteligencia artificial.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
