import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 499,
    priceId: 'price_starter', // Replace with actual Stripe price ID
    description: 'Perfecto para emprendedores y pequenos negocios.',
    features: [
      '250 mensajes/dia',
      '1 numero de WhatsApp',
      '500 contactos',
      'IA basica',
      'Agenda de citas',
      'Soporte por email',
    ],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    priceId: 'price_pro', // Replace with actual Stripe price ID
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
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceId: null,
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
    popular: false,
  },
];

export function PlanSelectionPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async () => {
    if (!selectedPlan) return;

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    // Enterprise plan - contact sales
    if (!plan.priceId) {
      window.location.href = 'mailto:ventas@chati.io?subject=Plan Enterprise';
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      
      // Create Stripe checkout session
      const response = await api.post<{
        success: boolean;
        data: { checkoutUrl: string };
      }>(
        '/billing/create-checkout-session',
        { priceId: plan.priceId, planId: plan.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.data.checkoutUrl;
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setError('Error al procesar el pago. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  const handleSkipTrial = async () => {
    // Start free trial without payment
    setIsLoading(true);
    try {
      const token = await getToken();
      
      await api.post(
        '/billing/start-trial',
        { planId: 'starter' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to start trial:', err);
      setError('Error al iniciar el trial. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Elige tu plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comienza con 14 dias gratis. Puedes cambiar o cancelar en cualquier
            momento.
          </p>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                'relative cursor-pointer rounded-2xl p-6 transition-all duration-300',
                selectedPlan === plan.id
                  ? 'bg-white ring-2 ring-primary-500 shadow-xl'
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-gradient-to-r from-primary-600 to-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Recomendado
                  </span>
                </div>
              )}

              {/* Selection indicator */}
              <div
                className={cn(
                  'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  selectedPlan === plan.id
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-300'
                )}
              >
                {selectedPlan === plan.id && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Plan details */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plan.name}
              </h3>

              <div className="mb-4">
                {plan.price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-500">/mes</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">
                    Personalizado
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={handleSelectPlan}
            disabled={!selectedPlan || isLoading}
            className="w-full sm:w-auto px-8 rounded-xl"
            rightIcon={
              isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )
            }
          >
            {isLoading ? 'Procesando...' : 'Continuar con el pago'}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handleSkipTrial}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Comenzar trial gratis
          </Button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          Todos los precios en pesos mexicanos. IVA no incluido. Puedes cancelar
          en cualquier momento.
        </motion.p>
      </div>
    </div>
  );
}
