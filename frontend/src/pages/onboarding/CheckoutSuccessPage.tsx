import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui';
import api from '../../lib/api';

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getToken } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setError('Sesion de pago no encontrada');
        setIsVerifying(false);
        return;
      }

      try {
        const token = await getToken();
        
        await api.post(
          '/billing/verify-checkout',
          { sessionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setIsVerifying(false);
      } catch (err) {
        console.error('Failed to verify payment:', err);
        setError('Error al verificar el pago. Por favor contacta soporte.');
        setIsVerifying(false);
      }
    }

    verifyPayment();
  }, [sessionId, getToken]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Hubo un problema
          </h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button onClick={() => navigate('/onboarding/plan')}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pago exitoso!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Tu cuenta ha sido activada. Ya puedes comenzar a usar Chati para
          automatizar tu WhatsApp.
        </p>

        <Button
          size="lg"
          onClick={() => navigate('/dashboard')}
          className="px-8 rounded-xl"
        >
          Ir al Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
