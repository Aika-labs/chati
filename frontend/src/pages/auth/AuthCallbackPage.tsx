import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      const isNewUser = searchParams.get('isNewUser') === 'true';
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(error));
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('No se recibió token de autenticación');
        return;
      }

      try {
        // Store the token
        localStorage.setItem('token', token);

        // Fetch user info with the new token
        const response = await fetch(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }

        const data = await response.json() as {
          success: boolean;
          data: {
            userId: string;
            tenantId: string;
            tenant: {
              id: string;
              name: string;
              slug: string;
              status: string;
              plan: string;
            };
          };
        };

        if (!data.success) {
          throw new Error('Invalid response');
        }

        // Update auth store
        setAuth({
          token,
          user: {
            id: data.data.userId,
            email: '', // Will be fetched from full user data
            name: data.data.tenant.name,
            role: 'OWNER',
            tenantId: data.data.tenantId,
          },
          tenant: {
            id: data.data.tenant.id,
            businessName: data.data.tenant.name,
            slug: data.data.tenant.slug,
            plan: data.data.tenant.plan as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE',
            status: data.data.tenant.status as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
            timezone: 'America/Mexico_City',
            workingHoursStart: '09:00',
            workingHoursEnd: '18:00',
            workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          },
        });

        setStatus('success');
        setMessage(isNewUser ? '¡Cuenta creada exitosamente!' : '¡Bienvenido de vuelta!');

        // Redirect after a short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Error al procesar la autenticación');
      }
    };

    processCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            )}
          </div>

          {/* Message */}
          <h2 className={`text-xl font-semibold mb-2 ${
            status === 'error' ? 'text-red-700' : 'text-gray-900'
          }`}>
            {status === 'loading' && 'Autenticando...'}
            {status === 'success' && '¡Listo!'}
            {status === 'error' && 'Error'}
          </h2>
          <p className={`${
            status === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {message}
          </p>

          {/* Error action */}
          {status === 'error' && (
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Volver al inicio de sesión
            </button>
          )}

          {/* Success redirect notice */}
          {status === 'success' && (
            <p className="mt-4 text-sm text-gray-500">
              Redirigiendo al dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
