import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      
      <main
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
