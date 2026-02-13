import { useRef } from 'react';
import { Star, Quote } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { Avatar } from '../ui';

const testimonials = [
  {
    name: 'Maria Garcia',
    role: 'Duena de Salon de Belleza',
    content:
      'Chati transformo mi negocio. Antes perdia clientes porque no podia contestar a tiempo. Ahora la IA responde 24/7 y mis citas se agendan solas.',
    rating: 5,
    highlight: true,
  },
  {
    name: 'Carlos Rodriguez',
    role: 'Director de Clinica Dental',
    content:
      'La integracion con Google Calendar es perfecta. Mis pacientes agendan citas por WhatsApp y todo se sincroniza automaticamente.',
    rating: 5,
    highlight: false,
  },
  {
    name: 'Ana Martinez',
    role: 'Gerente de Restaurante',
    content:
      'Subi mi menu en PDF y ahora la IA responde preguntas sobre platillos, precios y hasta hace recomendaciones. Mis clientes estan encantados.',
    rating: 5,
    highlight: false,
  },
  {
    name: 'Roberto Sanchez',
    role: 'Dueno de Taller Mecanico',
    content:
      'El CRM integrado me ayuda a dar seguimiento a cada cliente. Se exactamente que servicio necesita cada auto.',
    rating: 5,
    highlight: false,
  },
  {
    name: 'Laura Hernandez',
    role: 'Consultora de Negocios',
    content:
      'La base de conocimiento es genial. Subi mis documentos de servicios y la IA responde preguntas tecnicas mejor que yo misma.',
    rating: 5,
    highlight: true,
  },
  {
    name: 'Miguel Torres',
    role: 'Director de Gimnasio',
    content:
      'Pase de responder 100 mensajes diarios a solo revisar los que necesitan atencion humana. Ahorro 4 horas al dia facilmente.',
    rating: 5,
    highlight: false,
  },
];

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof testimonials)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group relative ${
        testimonial.highlight ? 'md:col-span-2' : ''
      }`}
    >
      <div className="relative h-full bg-white rounded-3xl p-8 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-xl overflow-hidden">
        {/* Quote icon */}
        <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <Quote className="w-20 h-20" />
        </div>

        {/* Rating */}
        <div className="flex gap-1 mb-6">
          {[...Array(testimonial.rating)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.05 }}
            >
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <p
          className={`text-gray-700 leading-relaxed mb-8 ${
            testimonial.highlight ? 'text-lg' : ''
          }`}
        >
          &ldquo;{testimonial.content}&rdquo;
        </p>

        {/* Author */}
        <div className="flex items-center gap-4">
          <Avatar name={testimonial.name} size="lg" />
          <div>
            <div className="font-semibold text-gray-900">{testimonial.name}</div>
            <div className="text-sm text-gray-500">{testimonial.role}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-[#fafafa]">
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
            Amado por{' '}
            <span className="text-gradient">miles de negocios</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed">
            Descubre por que mas de 10,000 negocios confian en Chati para
            automatizar su comunicacion.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={index}
            />
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { value: '10K+', label: 'Negocios activos' },
            { value: '50M+', label: 'Mensajes enviados' },
            { value: '98%', label: 'Satisfaccion' },
            { value: '4.9', label: 'Rating promedio' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-gradient">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
