import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 499,
    description: 'Perfecto para emprendedores y pequeños negocios.',
    features: [
      '250 mensajes/día',
      '1 número de WhatsApp',
      '500 contactos',
      'IA básica',
      'Agenda de citas',
      'Soporte por email',
    ],
    cta: 'Comenzar',
    popular: false,
  },
  {
    name: 'Pro',
    price: 999,
    description: 'Para negocios en crecimiento que necesitan más.',
    features: [
      '1,000 mensajes/día',
      '3 números de WhatsApp',
      '5,000 contactos',
      'IA avanzada + RAG',
      'Base de conocimiento',
      'Google Calendar',
      'Analytics avanzados',
      'Soporte prioritario',
    ],
    cta: 'Comenzar',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Soluciones personalizadas para grandes empresas.',
    features: [
      'Mensajes ilimitados',
      'Números ilimitados',
      'Contactos ilimitados',
      'IA personalizada',
      'API dedicada',
      'SLA garantizado',
      'Onboarding dedicado',
      'Soporte 24/7',
    ],
    cta: 'Contactar',
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Planes simples,{' '}
            <span className="text-gradient">precios transparentes</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Elige el plan que mejor se adapte a tu negocio. 
            Todos incluyen 14 días de prueba gratis.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative bg-white rounded-2xl p-8 border-2 transition-all duration-300',
                plan.popular
                  ? 'border-primary-500 shadow-xl scale-105'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-lg'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Más Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  {plan.price ? (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-500">/mes MXN</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">
                      Personalizado
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to={plan.price ? '/register' : '/contact'}>
                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Todos los precios en pesos mexicanos. IVA no incluido.
        </p>
      </div>
    </section>
  );
}
