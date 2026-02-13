import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const faqs = [
  {
    question: 'Necesito un numero de WhatsApp Business?',
    answer:
      'Si, necesitas una cuenta de WhatsApp Business API. Te ayudamos con el proceso de verificacion y configuracion. El proceso toma aproximadamente 24-48 horas.',
  },
  {
    question: 'Como funciona la IA?',
    answer:
      'Utilizamos LLaMA 3.3, uno de los modelos de IA mas avanzados. La IA aprende de tu base de conocimiento (PDFs, Excel, etc.) y responde preguntas de forma natural, detectando intenciones como agendar citas, consultar precios o solicitar informacion.',
  },
  {
    question: 'Puedo ver las conversaciones antes de que la IA responda?',
    answer:
      'Si, puedes configurar la IA para que solo sugiera respuestas y tu las apruebes, o dejarla en modo automatico. Tambien puedes tomar el control de cualquier conversacion en cualquier momento.',
  },
  {
    question: 'Que pasa si supero el limite de mensajes?',
    answer:
      'Te notificamos cuando estes cerca del limite. Puedes actualizar tu plan en cualquier momento o comprar mensajes adicionales. Nunca cortamos el servicio sin aviso.',
  },
  {
    question: 'Mis datos estan seguros?',
    answer:
      'Absolutamente. Usamos encriptacion de extremo a extremo, servidores en Europa con cumplimiento GDPR, y cada tenant esta completamente aislado. Hacemos backups automaticos diarios.',
  },
  {
    question: 'Puedo cancelar en cualquier momento?',
    answer:
      'Si, puedes cancelar tu suscripcion cuando quieras. No hay contratos de permanencia. Si cancelas, mantienes acceso hasta el final del periodo pagado.',
  },
  {
    question: 'Ofrecen soporte en espanol?',
    answer:
      'Si, todo nuestro equipo de soporte habla espanol. Ofrecemos soporte por email, chat y videollamada dependiendo de tu plan.',
  },
  {
    question: 'Puedo integrar Chati con otras herramientas?',
    answer:
      'Si, ofrecemos integracion con Google Calendar, Google Sheets, y una API REST completa para integraciones personalizadas. En el plan Enterprise incluimos integraciones a medida.',
  },
];

function FAQItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div
        className={cn(
          'bg-white rounded-2xl border transition-all duration-300',
          isOpen
            ? 'border-primary-200 shadow-lg shadow-primary-100/50'
            : 'border-gray-100 hover:border-gray-200'
        )}
      >
        <button
          className="w-full px-6 py-5 flex items-center justify-between text-left"
          onClick={onToggle}
        >
          <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
              isOpen ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
            )}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-5 text-gray-600 leading-relaxed">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section id="faq" className="py-24 md:py-32 bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Preguntas{' '}
            <span className="text-gradient">frecuentes</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600">
            Tienes dudas? Aqui respondemos las mas comunes.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600">
            No encontraste lo que buscabas?{' '}
            <a
              href="mailto:soporte@chati.io"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Contactanos
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
