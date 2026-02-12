import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, MessageCircle } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const navLinks = [
  { name: 'Características', href: '#features' },
  { name: 'Precios', href: '#pricing' },
  { name: 'Testimonios', href: '#testimonials' },
  { name: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Chati</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link to="/register">
              <Button>Comenzar Gratis</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg transition-all duration-300',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
      >
        <div className="px-4 py-4 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="block text-base font-medium text-gray-600 hover:text-primary-600"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <Link to="/login" className="block">
              <Button variant="secondary" className="w-full">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/register" className="block">
              <Button className="w-full">Comenzar Gratis</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
