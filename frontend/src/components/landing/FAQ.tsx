import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const faqs = [
  {
    question: '¿Necesito un número de WhatsApp Business?',
    answer: 'Sí, necesitas una cuenta de WhatsApp Business API. Te ayudamos con el proceso de verificación y configuración. El proceso toma aproximadamente 24-48 horas.',
  },
  {
    question: '¿Cómo funciona la IA?',
    answer: 'Utilizamos LLaMA 3.3, uno de los modelos de IA más avanzados. La IA aprende de tu base de conocimiento (PDFs, Excel, etc.) y responde preguntas de forma natural, detectando intenciones como agendar citas, consultar precios o solicitar información.',
  },
  {
    question: '¿Puedo ver las conversaciones antes de que la IA responda?',
    answer: 'Sí, puedes configurar la IA para que solo sugiera respuestas y tú las apruebes, o dejarla en modo automático. También puedes tomar el control de cualquier conversación en cualquier momento.',
  },
  {
    question: '¿Qué pasa si supero el límite de mensajes?',
    answer: 'Te notificamos cuando estés cerca del límite. Puedes actualizar tu plan en cualquier momento o comprar mensajes adicionales. Nunca cortamos el servicio sin aviso.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Absolutamente. Usamos encriptación de extremo a extremo, servidores en Europa con cumplimiento GDPR, y cada tenant está completamente aislado. Hacemos backups automáticos diarios.',
  },
  {
    question: '¿Puedo cancelar en cualquier momento?',
    answer: 'Sí, puedes cancelar tu suscripción cuando quieras. No hay contratos de permanencia. Si cancelas, mantienes acceso hasta el final del período pagado.',
  },
  {
    question: '¿Ofrecen soporte en español?',
    answer: 'Sí, todo nuestro equipo de soporte habla español. Ofrecemos soporte por email, chat y videollamada dependiendo de tu plan.',
  },
  {
    question: '¿Puedo integrar Chati con otras herramientas?',
    answer: 'Sí, ofrecemos integración con Google Calendar, Google Sheets, y una API REST completa para integraciones personalizadas. En el plan Enterprise incluimos integraciones a medida.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Preguntas{' '}
            <span className="text-gradient">frecuentes</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            ¿Tienes dudas? Aquí respondemos las más comunes.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-gray-500 transition-transform duration-200',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                )}
              >
                <p className="px-6 pb-4 text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
