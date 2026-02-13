import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../stores/theme.store';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();

  const themes = [
    { id: 'light' as const, icon: Sun, label: 'Claro' },
    { id: 'dark' as const, icon: Moon, label: 'Oscuro' },
    { id: 'system' as const, icon: Monitor, label: 'Sistema' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      {themes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={cn(
            'relative p-2 rounded-md transition-colors',
            theme === id
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
          title={label}
        >
          {theme === id && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md shadow-sm"
              transition={{ type: 'spring', duration: 0.3 }}
            />
          )}
          <Icon className="w-4 h-4 relative z-10" />
          {showLabel && (
            <span className="ml-2 text-sm relative z-10">{label}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Simple toggle button (just light/dark)
export function ThemeToggleSimple({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
        'text-gray-600 dark:text-gray-300',
        className
      )}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </motion.div>
    </button>
  );
}
