import { Link, useLocation } from 'react-router-dom';
import { 
  MessageCircle, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Package
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '../ui';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageCircle, label: 'Conversaciones', href: '/dashboard/conversations' },
  { icon: Users, label: 'Contactos', href: '/dashboard/contacts' },
  { icon: Calendar, label: 'Calendario', href: '/dashboard/calendar' },
  { icon: Package, label: 'Productos', href: '/dashboard/products' },
  { icon: FileText, label: 'Documentos', href: '/dashboard/documents' },
  { icon: Settings, label: 'Configuración', href: '/dashboard/settings' },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, tenant, logout } = useAuthStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900">Chati</span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            'p-2 rounded-lg hover:bg-gray-100 transition-colors',
            isCollapsed && 'absolute -right-3 top-6 bg-white border border-gray-200 shadow-sm'
          )}
        >
          <ChevronLeft className={cn('w-5 h-5 text-gray-500 transition-transform', isCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-600')} />
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help */}
      <div className="px-3 py-2">
        <Link
          to="/dashboard/help"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Ayuda</span>}
        </Link>
      </div>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors',
          isCollapsed && 'justify-center'
        )}>
          <Avatar name={user?.name} size="sm" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{tenant?.businessName}</div>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
