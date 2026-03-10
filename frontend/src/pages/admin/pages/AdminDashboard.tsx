import { useEffect, useState } from 'react';
import { adminService, type AdminStats } from '../../../services/admin.service';
import { 
  Users, 
  Dumbbell, 
  Calendar, 
  UserCheck,
  UserX,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, activityData] = await Promise.all([
        adminService.getStats(),
        adminService.getRecentActivity(5),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (err: any) {
      console.error('Błąd ładowania danych:', err);
      console.error('Response:', err.response?.data);
      setError(err.response?.data?.message || 'Nie udało się załadować danych. Sprawdź połączenie z serwerem.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert alert-error shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Błąd ładowania danych</h3>
              <div className="text-sm">{error}</div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={loadData}>
            Spróbuj ponownie
          </button>
        </div>
        <div className="alert alert-info">
          <div className="text-sm">
            <p className="font-semibold">Upewnij się że:</p>
            <ul className="mt-2 list-inside list-disc">
              <li>Backend działa na porcie 3000</li>
              <li>Jesteś zalogowany jako administrator</li>
              <li>Masz połączenie z internetem</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Wszystkich użytkowników',
      value: stats?.totalUsers || 0,
      color: 'bg-primary',
      iconColor: 'text-primary-content',
    },
    {
      icon: UserCheck,
      label: 'Aktywnych użytkowników',
      value: stats?.activeUsers || 0,
      color: 'bg-success',
      iconColor: 'text-success-content',
    },
    {
      icon: UserX,
      label: 'Zablokowanych użytkowników',
      value: stats?.blockedUsers || 0,
      color: 'bg-error',
      iconColor: 'text-error-content',
    },
    {
      icon: Calendar,
      label: 'Planów treningowych',
      value: stats?.totalPlans || 0,
      color: 'bg-secondary',
      iconColor: 'text-secondary-content',
    },
    {
      icon: Dumbbell,
      label: 'Ćwiczeń w bazie',
      value: stats?.totalExercises || 0,
      color: 'bg-accent',
      iconColor: 'text-accent-content',
    },
    {
      icon: TrendingUp,
      label: 'Planów w tym tygodniu',
      value: stats?.plansCreatedThisWeek || 0,
      color: 'bg-info',
      iconColor: 'text-info-content',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-base-content">Dashboard</h1>
        <p className="text-base-content/70">Przegląd systemu Wirtualny Trener</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <div key={index} className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-base-content/70">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${stat.color}`}>
                  <stat.icon className={`h-7 w-7 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">
              <Activity className="h-5 w-5" />
              Ostatnio zarejestrowani użytkownicy
            </h2>
            <div className="divider my-2"></div>
            <div className="space-y-3">
              {recentActivity?.recentUsers?.length > 0 ? (
                recentActivity.recentUsers.map((user: any) => (
                  <div key={user._id} className="flex items-center justify-between rounded-lg bg-base-200/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <span className="text-sm font-semibold">{user.email[0].toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{user.name || user.email}</p>
                        <p className="text-xs text-base-content/60">
                          {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                    </div>
                    <div className="badge badge-primary badge-sm">{user.role}</div>
                  </div>
                ))
              ) : (
                <p className="text-center text-base-content/60">Brak danych</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Plans */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">
              <Calendar className="h-5 w-5" />
              Ostatnio utworzone plany
            </h2>
            <div className="divider my-2"></div>
            <div className="space-y-3">
              {recentActivity?.recentPlans?.length > 0 ? (
                recentActivity.recentPlans.map((plan: any) => (
                  <div key={plan._id} className="flex items-center justify-between rounded-lg bg-base-200/50 p-3">
                    <div>
                      <p className="font-semibold">{plan.name || 'Plan treningowy'}</p>
                      <p className="text-xs text-base-content/60">
                        {plan.user?.email || plan.user?.name || 'Nieznany użytkownik'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-base-content/60">
                        {new Date(plan.createdAt).toLocaleDateString('pl-PL')}
                      </p>
                      <p className="text-xs font-semibold text-primary">
                        {plan.daysPerWeek} dni/tydzień
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-base-content/60">Brak danych</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Szybkie akcje</h2>
          <div className="divider my-2"></div>
          <div className="flex flex-wrap gap-4">
            <button 
              className="btn btn-primary gap-2"
              onClick={() => window.location.href = '/admin/users'}
            >
              <Users className="h-5 w-5" />
              Zarządzaj użytkownikami
            </button>
            <button 
              className="btn btn-secondary gap-2"
              onClick={() => window.location.href = '/admin/exercises'}
            >
              <Dumbbell className="h-5 w-5" />
              Zarządzaj ćwiczeniami
            </button>
            <button 
              className="btn btn-accent gap-2"
              onClick={loadData}
            >
              <Activity className="h-5 w-5" />
              Odśwież dane
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
