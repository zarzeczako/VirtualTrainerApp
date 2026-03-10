import { useEffect, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { AuthenticatedUser } from '../home/models/user.model';
import ThemeController from '../../components/ThemeController';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Settings, 
  LogOut,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!authService.isAuthenticated()) {
          navigate('/login');
          return;
        }

        const profile = await authService.getProfile();
        
        if ((profile as any).role !== 'admin') {
          navigate('/dashboard');
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Błąd weryfikacji administratora:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'Użytkownicy' },
    { path: '/admin/exercises', icon: Dumbbell, label: 'Ćwiczenia' },
    { path: '/admin/settings', icon: Settings, label: 'Ustawienia' },
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-base-200">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-base-100 shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-base-300 p-4">
            <div>
              <h1 className="text-xl font-bold text-primary">Panel Admina</h1>
              <p className="text-xs text-base-content/60">Wirtualny Trener</p>
            </div>
            <button
              className="btn btn-ghost btn-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="border-b border-base-300 p-4">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content">
                  <span className="text-lg font-bold">A</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold">{user?.name || 'Administrator'}</p>
                <p className="truncate text-xs text-base-content/60">{user?.email || 'admin@gmail.com'}</p>
                <div className="mt-1">
                  <span className="badge badge-primary badge-xs">Admin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                      isActive(item.path, item.exact)
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-200'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Theme Controller */}
            <div className="mt-4 rounded-lg bg-base-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-base-content/70">Motyw</span>
                <ThemeController />
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-base-300 p-4 space-y-2">
            <Link
              to="/dashboard"
              className="btn btn-primary btn-outline btn-sm w-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Powrót do dashboardu
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-error btn-outline btn-sm w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj się
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="border-b border-base-300 bg-base-100 p-4 lg:hidden">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
