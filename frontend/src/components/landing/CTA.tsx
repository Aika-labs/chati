import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui';

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-primary-600 to-emerald-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          ¿Listo para automatizar tu WhatsApp?
        </h2>
        <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
          Únete a miles de negocios que ya ahorran tiempo y dinero con Chati. 
          Comienza gratis hoy mismo.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-gray-100"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Comenzar Gratis
            </Button>
          </Link>
          <Link to="/contact">
            <Button
              variant="ghost"
              size="lg"
              className="text-white border-white/30 hover:bg-white/10"
            >
              Hablar con Ventas
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-primary-200">
          Sin tarjeta de crédito • 14 días gratis • Cancela cuando quieras
        </p>
      </div>
    </section>
  );
}
