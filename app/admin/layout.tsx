'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Dashboard'   },
  { href: '/admin/users',    icon: '👥', label: 'Usuarios'    },
  { href: '/admin/analytics',icon: '📈', label: 'Analítica'   },
  { href: '/admin/referrals',icon: '🔗', label: 'Referidos'   },
  { href: '/admin/costs',    icon: '💰', label: 'CAC & Costos' },
  { href: '/admin/moderation', icon: '🛡️', label: 'Moderación' },
  { href: '/admin/support',  icon: '⚙️', label: 'Soporte'     },
  { href: '/admin/insights', icon: '🧠', label: 'Perfiles IA'  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/admin/login') return <>{children}</>;

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="text-xl font-black tracking-tight text-white">
          only<span className="text-[#4da8ff]">fam</span>
          <span className="ml-2 text-xs font-normal text-white/50 uppercase tracking-widest">admin</span>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/65 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="px-4 py-4 border-t border-white/10">
        <Link
          href="/admin/login"
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-[#f6f6f7] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#1a1a2e] flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile: hamburger + overlay */}
      <div className="md:hidden">
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-20"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#1a1a2e] z-30 flex flex-col">
              <Sidebar />
            </aside>
          </>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">
            only<span className="text-[#1A6FD4]">fam</span> admin
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
