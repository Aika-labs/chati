import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  MessageSquare,
  Brain,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Business API',
    description:
      'Conecta tu numero de WhatsApp Business y gestiona todas las conversaciones desde un solo lugar.',
    gradient: 'from-green-400 to-emerald-500',
    size: 'large',
  },
  {
    icon: Brain,
    title: 'IA Conversacional',
    description:
      'Respuestas automaticas inteligentes con LLaMA 3.3. Detecta intenciones y responde como un humano.',
    gradient: 'from-purple-400 to-violet-500',
    size: 'medium',
  },
  {
    icon: FileText,
    title: 'Base de Conocimiento',
    description:
      'Sube PDFs, Excel o conecta Google Sheets. La IA aprende de tu informacion.',
    gradient: 'from-blue-400 to-cyan-500',
    size: 'medium',
  },
  {
    icon: Calendar,
    title: 'Agenda de Citas',
    description:
      'Tus clientes agendan citas por WhatsApp. Sincroniza con Google Calendar automaticamente.',
    gradient: 'from-orange-400 to-amber-500',
    size: 'large',
  },
  {
    icon: Users,
    title: 'CRM Integrado',
    description:
      'Gestiona contactos, etiquetas, notas y todo el historial de conversaciones.',
    gradient: 'from-pink-400 to-rose-500',
    size: 'medium',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Metricas de conversaciones, tiempos de respuesta y satisfaccion en tiempo real.',
    gradient: 'from-cyan-400 to-teal-500',
    size: 'small',
  },
  {
    icon: Zap,
    title: 'Respuestas Instantaneas',
    description: 'Responde en segundos, 24/7. Nunca pierdas un cliente.',
    gradient: 'from-yellow-400 to-orange-500',
    size: 'small',
  },
  {
    icon: Shield,
    title: 'Seguridad Enterprise',
    description: 'Datos encriptados, multi-tenant aislado y cumplimiento GDPR.',
    gradient: 'from-red-400 to-pink-500',
    size: 'medium',
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const sizeClasses: Record<string, string> = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-1 row-span-1 md:col-span-1',
    large: 'col-span-1 row-span-1 md:col-span-2',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`${sizeClasses[feature.size]} group`}
    >
      <div className="relative h-full bg-white rounded-3xl p-6 md:p-8 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-2xl hover:shadow-gray-200/50 overflow-hidden">
        {/* Gradient background on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
        />

        {/* Icon */}
        <motion.div
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <feature.icon className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="relative text-xl font-semibold text-gray-900 mb-3">
          {feature.title}
        </h3>
        <p className="relative text-gray-600 leading-relaxed">
          {feature.description}
        </p>

        {/* Decorative element for large cards */}
        {feature.size === 'large' && (
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10">
            <feature.icon className="w-full h-full" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Features() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section id="features" className="py-24 md:py-32 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Todo lo que necesitas.{' '}
            <span className="text-gradient">Nada que no.</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed">
            Una plataforma completa para gestionar tu comunicacion con clientes,
            potenciada por inteligencia artificial de ultima generacion.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 md:mt-20 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex -space-x-2">
              {[
                'from-green-400 to-emerald-500',
                'from-purple-400 to-violet-500',
                'from-blue-400 to-cyan-500',
              ].map((gradient, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} border-2 border-white`}
                />
              ))}
            </div>
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">+50 integraciones</span>{' '}
              disponibles
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
