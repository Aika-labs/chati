import { useRef } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 499,
    description: 'Perfecto para emprendedores y pequenos negocios.',
    features: [
      '250 mensajes/dia',
      '1 numero de WhatsApp',
      '500 contactos',
      'IA basica',
      'Agenda de citas',
      'Soporte por email',
    ],
    cta: 'Comenzar',
    popular: false,
    gradient: 'from-gray-100 to-gray-50',
  },
  {
    name: 'Pro',
    price: 999,
    description: 'Para negocios en crecimiento que necesitan mas.',
    features: [
      '1,000 mensajes/dia',
      '3 numeros de WhatsApp',
      '5,000 contactos',
      'IA avanzada + RAG',
      'Base de conocimiento',
      'Google Calendar',
      'Analytics avanzados',
      'Soporte prioritario',
    ],
    cta: 'Comenzar',
    popular: true,
    gradient: 'from-primary-500 to-emerald-500',
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Soluciones personalizadas para grandes empresas.',
    features: [
      'Mensajes ilimitados',
      'Numeros ilimitados',
      'Contactos ilimitados',
      'IA personalizada',
      'API dedicada',
      'SLA garantizado',
      'Onboarding dedicado',
      'Soporte 24/7',
    ],
    cta: 'Contactar',
    popular: false,
    gradient: 'from-gray-100 to-gray-50',
  },
];

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof plans)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={cn(
        'relative group',
        plan.popular && 'md:-mt-4 md:mb-4'
      )}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Mas Popular
          </motion.div>
        </div>
      )}

      <div
        className={cn(
          'relative h-full rounded-3xl p-8 transition-all duration-500',
          plan.popular
            ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl shadow-gray-900/20'
            : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-xl'
        )}
      >
        {/* Glow effect for popular */}
        {plan.popular && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/20 to-emerald-500/20 blur-xl opacity-50" />
        )}

        <div className="relative">
          {/* Plan name */}
          <h3
            className={cn(
              'text-xl font-semibold mb-2',
              plan.popular ? 'text-white' : 'text-gray-900'
            )}
          >
            {plan.name}
          </h3>

          {/* Price */}
          <div className="mb-4">
            {plan.price ? (
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-5xl font-bold tracking-tight',
                    plan.popular ? 'text-white' : 'text-gray-900'
                  )}
                >
                  ${plan.price}
                </span>
                <span
                  className={cn(
                    'text-lg',
                    plan.popular ? 'text-gray-400' : 'text-gray-500'
                  )}
                >
                  /mes
                </span>
              </div>
            ) : (
              <span
                className={cn(
                  'text-3xl font-bold',
                  plan.popular ? 'text-white' : 'text-gray-900'
                )}
              >
                Personalizado
              </span>
            )}
          </div>

          {/* Description */}
          <p
            className={cn(
              'text-sm mb-8',
              plan.popular ? 'text-gray-400' : 'text-gray-600'
            )}
          >
            {plan.description}
          </p>

          {/* CTA Button */}
          <Link to={plan.price ? '/sign-up' : '/contact'} className="block mb-8">
            <Button
              className={cn(
                'w-full rounded-xl py-3',
                plan.popular
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              )}
            >
              {plan.cta}
            </Button>
          </Link>

          {/* Features */}
          <ul className="space-y-4">
            {plan.features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    plan.popular
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-primary-100 text-primary-600'
                  )}
                >
                  <Check className="w-3 h-3" />
                </div>
                <span
                  className={cn(
                    'text-sm',
                    plan.popular ? 'text-gray-300' : 'text-gray-600'
                  )}
                >
                  {feature}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  const headerRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="py-24 md:py-32 bg-white">
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
            Precios simples.{' '}
            <span className="text-gradient">Sin sorpresas.</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed">
            Elige el plan que mejor se adapte a tu negocio. Todos incluyen 14
            dias de prueba gratis.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12 text-sm text-gray-500"
        >
          Todos los precios en pesos mexicanos. IVA no incluido.
        </motion.p>
      </div>
    </section>
  );
}
