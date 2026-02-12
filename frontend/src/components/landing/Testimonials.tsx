import { Star } from 'lucide-react';
import { Avatar } from '../ui';

const testimonials = [
  {
    name: 'María García',
    role: 'Dueña de Salón de Belleza',
    avatar: null,
    content: 'Chati transformó mi negocio. Antes perdía clientes porque no podía contestar a tiempo. Ahora la IA responde 24/7 y mis citas se agendan solas.',
    rating: 5,
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Director de Clínica Dental',
    avatar: null,
    content: 'La integración con Google Calendar es perfecta. Mis pacientes agendan citas por WhatsApp y todo se sincroniza automáticamente. Increíble.',
    rating: 5,
  },
  {
    name: 'Ana Martínez',
    role: 'Gerente de Restaurante',
    avatar: null,
    content: 'Subí mi menú en PDF y ahora la IA responde preguntas sobre platillos, precios y hasta hace recomendaciones. Mis clientes están encantados.',
    rating: 5,
  },
  {
    name: 'Roberto Sánchez',
    role: 'Dueño de Taller Mecánico',
    avatar: null,
    content: 'El CRM integrado me ayuda a dar seguimiento a cada cliente. Sé exactamente qué servicio necesita cada auto y cuándo fue su última visita.',
    rating: 5,
  },
  {
    name: 'Laura Hernández',
    role: 'Consultora de Negocios',
    avatar: null,
    content: 'La base de conocimiento es genial. Subí mis documentos de servicios y la IA responde preguntas técnicas mejor que yo misma.',
    rating: 5,
  },
  {
    name: 'Miguel Torres',
    role: 'Director de Gimnasio',
    avatar: null,
    content: 'Pasé de responder 100 mensajes diarios a solo revisar los que necesitan atención humana. Ahorro 4 horas al día fácilmente.',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Lo que dicen{' '}
            <span className="text-gradient">nuestros clientes</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Miles de negocios ya automatizan su WhatsApp con Chati.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-3">
                <Avatar name={testimonial.name} size="md" />
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
