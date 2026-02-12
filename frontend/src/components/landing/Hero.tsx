import { Link } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle } from 'lucide-react';
import { Button } from '../ui';

const benefits = [
  'Sin tarjeta de crédito',
  '14 días gratis',
  'Configuración en 5 minutos',
];

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-emerald-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-100/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 rounded-full text-primary-700 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse" />
              Nuevo: Integración con Google Calendar
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Automatiza tu{' '}
              <span className="text-gradient">WhatsApp</span>{' '}
              con Inteligencia Artificial
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl">
              Responde automáticamente a tus clientes, agenda citas, envía cotizaciones 
              y gestiona tu negocio desde una sola plataforma. Potenciado por IA.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/register">
                <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Comenzar Gratis
                </Button>
              </Link>
              <Button variant="secondary" size="lg" leftIcon={<Play className="w-5 h-5" />}>
                Ver Demo
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-primary-500 mr-2" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Dashboard preview */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border">
                    app.chati.io/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard preview image placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Vista previa del dashboard</p>
                </div>
              </div>
            </div>

            {/* Floating stats cards */}
            <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">98%</div>
              <div className="text-xs text-gray-500">Tasa de respuesta</div>
            </div>
            
            <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <div className="text-2xl font-bold text-primary-600">+250</div>
              <div className="text-xs text-gray-500">Mensajes/día</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
