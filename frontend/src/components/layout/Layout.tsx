import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
export default function Layout({ children }: { children: ReactNode }) {
  return (<div className="flex h-screen overflow-hidden"><Sidebar /><div className="flex flex-1 flex-col overflow-hidden"><Header /><main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" role="main">{children}</main><MobileBottomNav /></div></div>);
}
