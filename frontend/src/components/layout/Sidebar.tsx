import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { navigationItems, adminNavigationItem } from '@/config/navigation';

const items = navigationItems;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const all = user?.role === 'admin' ? [...items, adminNavigationItem] : items;

  return (
    <nav className={cn('hidden md:flex flex-col bg-card border-r transition-all duration-300 shadow-sm', collapsed ? 'w-[72px]' : 'w-[260px]')} aria-label="Main navigation">
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && <div className="flex items-center gap-2.5"><span className="text-2xl">✦</span><span className="text-lg font-bold gradient-text">Nexora</span></div>}
        {collapsed && <span className="text-2xl mx-auto">✦</span>}
        <button onClick={() => setCollapsed(!collapsed)} className={cn("rounded-lg p-1.5 hover:bg-accent transition-colors", collapsed && "mx-auto")} aria-label={collapsed ? 'Expand' : 'Collapse'}>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">{all.map(item => (
          <li key={item.path}><NavLink to={item.path} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200', isActive ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20' : 'text-muted-foreground hover:bg-accent hover:text-foreground', collapsed && 'justify-center px-2')} title={collapsed ? item.label : undefined}>
            <span className="text-lg shrink-0">{item.icon}</span>{!collapsed && <span>{item.label}</span>}
          </NavLink></li>
        ))}</ul>
      </div>
      {!collapsed && user && (
        <div className="border-t p-4"><div className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-md">{user.name.charAt(0).toUpperCase()}</div>
          <div className="flex-1 overflow-hidden"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted-foreground capitalize">{user.learningTrack === 'neurodivergent' ? user.neurodivergentType : 'standard'}</p></div>
        </div></div>
      )}
    </nav>
  );
}
