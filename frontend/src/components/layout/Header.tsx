import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { navigationItems } from '@/config/navigation';
export default function Header() {
  const { user, logout, notifications, unreadCount, fetchNotifications } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  useEffect(() => { fetchNotifications(); const i = setInterval(fetchNotifications, 30000); return () => clearInterval(i); }, [fetchNotifications]);
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <button className="md:hidden rounded-md p-2 hover:bg-accent" onClick={() => setShowMobile(!showMobile)} aria-label="Toggle menu"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
      <div className="flex items-center gap-2 md:hidden"><span className="text-xl">✦</span><span className="font-bold text-primary">Nexora</span></div>
      <div className="hidden md:block flex-1" />
      <div className="flex items-center gap-3">
        {user && <div className="hidden sm:flex items-center gap-1.5"><Badge variant="secondary">⚡ Lv.{user.level}</Badge><Badge variant="outline">✨ {user.xp} XP</Badge></div>}
        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative rounded-md p-2 hover:bg-accent" aria-label={`${unreadCount} notifications`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifs && <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border bg-card p-4 shadow-lg"><h3 className="mb-3 font-semibold">Notifications</h3><div className="max-h-64 space-y-2 overflow-y-auto">{notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications</p> : notifications.slice(0,8).map(n => <div key={n._id} className={`rounded-md p-2 text-sm ${n.read ? 'opacity-60' : 'bg-accent'}`}><p className="font-medium">{n.title}</p><p className="text-muted-foreground text-xs">{n.message}</p></div>)}</div></div>}
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/login'); }}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span className="hidden sm:inline ml-1">Logout</span></Button>
      </div>
      {showMobile && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setShowMobile(false)} /><nav className="absolute left-0 top-0 h-full w-64 bg-card p-4 shadow-lg"><div className="mb-6 flex items-center gap-2"><span className="text-2xl">✦</span><span className="text-lg font-bold text-primary">Nexora AI</span></div><ul className="space-y-1">{navigationItems.map(x=><li key={x.path}><NavLink to={x.path} onClick={()=>setShowMobile(false)} className={({isActive})=>`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${isActive?'bg-primary text-primary-foreground':'hover:bg-accent'}`}><span>{x.icon}</span><span>{x.label}</span></NavLink></li>)}</ul></nav></div>}
    </header>
  );
}
