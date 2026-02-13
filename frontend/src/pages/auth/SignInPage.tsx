import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center space-x-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Chati</span>
          </Link>

          <SignIn 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none bg-transparent',
                headerTitle: 'text-2xl font-bold text-gray-900',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
                formFieldInput: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
                footerActionLink: 'text-primary-600 hover:text-primary-700',
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
          />
        </div>
      </div>

      {/* Right side - Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-400 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-4">
            Automatiza tu WhatsApp con IA
          </h2>
          <p className="text-primary-100 text-lg">
            Responde automaticamente, agenda citas y gestiona tu negocio 
            desde una sola plataforma.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">+10K</div>
              <div className="text-sm text-primary-200">Negocios activos</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">98%</div>
              <div className="text-sm text-primary-200">Satisfaccion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
