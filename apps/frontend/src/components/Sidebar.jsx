import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard'},
  { to: '/keys', label: 'API Keys' },
  { to: '/playground', label: 'Playground'},
  { to: '/logs', label: 'Usage Logs' },
  { to: '/docs', label: 'Documentation' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-ink-50 border-r border-ink-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-ink-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            🚀
          </div>
          <div>
            <h1 className="font-bold text-ink-900 text-lg leading-tight">LinkForge AI</h1>
            <p className="text-xs text-ink-500">SaaS API Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-brand-700 border border-brand-200 shadow-sm'
                  : 'text-ink-600 hover:bg-white hover:text-ink-900'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-ink-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-semibold text-sm">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink-800 font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-ink-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-ink-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all text-left"
        >
           Sign out
        </button>
      </div>
    </aside>
  );
}
