import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { Button } from '../ui';

export function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 md:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Background card */}
          <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[2.5rem] p-12 md:p-20 overflow-hidden">
            {/* Animated gradient orbs */}
            <motion.div
              className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/30 rounded-full blur-[120px]"
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/30 rounded-full blur-[100px]"
              animate={{
                x: [0, -30, 0],
                y: [0, -50, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Content */}
            <div className="relative text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 mb-8"
              >
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-white/80">
                  Comienza en menos de 5 minutos
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight"
              >
                Listo para automatizar tu{' '}
                <span className="bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">
                  WhatsApp
                </span>
                ?
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6 text-lg md:text-xl text-gray-400 leading-relaxed"
              >
                Unete a mas de 10,000 negocios que ya estan ahorrando tiempo y
                aumentando sus ventas con Chati.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link to="/sign-up">
                  <Button
                    size="lg"
                    className="text-base px-8 py-4 rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Comenzar Gratis
                  </Button>
                </Link>
                <Link to="#pricing">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="text-base px-8 py-4 rounded-full bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    Ver Precios
                  </Button>
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-8 text-sm text-gray-500"
              >
                14 dias gratis. Sin tarjeta de credito. Cancela cuando quieras.
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
