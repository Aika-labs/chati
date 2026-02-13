import { Link } from 'react-router-dom';
import { MessageCircle, Twitter, Linkedin, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';

const footerLinks = {
  producto: [
    { name: 'Caracteristicas', href: '#features' },
    { name: 'Precios', href: '#pricing' },
    { name: 'Integraciones', href: '#' },
    { name: 'API', href: '#' },
  ],
  empresa: [
    { name: 'Sobre Nosotros', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Carreras', href: '#' },
    { name: 'Contacto', href: '#' },
  ],
  legal: [
    { name: 'Privacidad', href: '#' },
    { name: 'Terminos', href: '#' },
    { name: 'Cookies', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl flex items-center justify-center"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-white">Chati</span>
            </Link>
            <p className="mt-6 text-gray-400 max-w-xs leading-relaxed">
              Automatiza tu WhatsApp con inteligencia artificial. Responde,
              agenda y vende mientras duermes.
            </p>
            <div className="flex space-x-4 mt-8">
              {[
                { icon: Twitter, href: '#' },
                { icon: Linkedin, href: '#' },
                { icon: Instagram, href: '#' },
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
              Producto
            </h4>
            <ul className="space-y-4">
              {footerLinks.producto.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
              Empresa
            </h4>
            <ul className="space-y-4">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
              Legal
            </h4>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Chati. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-500">
            Hecho con amor en Mexico
          </p>
        </div>
      </div>
    </footer>
  );
}
