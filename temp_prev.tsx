// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Formatter,
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import AppHeader from '../components/AppHeader';
import ProfileSidebar from './home/components/ProfileSidebar';
import type {
  AuthenticatedUser,
  ProfileEditableFields,
} from './home/models/user.model';
import { authService } from '../services/auth.service';
import type {
  MuscleDistributionEntry,
  ProgressStatsResponse,
  StrengthStat,
} from '../services/progress.service';
import { progressService } from '../services/progress.service';

interface CombinedChartPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
}

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString('pl-PL', {
    month: 'short',
    year: 'numeric',
  });

const strengthTooltipFormatter: Formatter<ValueType, NameType> = (
  value,
  name,
) => {
  if (typeof value !== 'number') {
    return ['-', String(name ?? '')];
  }

  const label = name === 'actual' ? 'Historia' : 'Prognoza AI';
  return [`${value.toFixed(1)} kg`, label];
};

const chartColors = {
  axes: '#94a3b8',
  grid: '#1e2738',
  tooltipBg: '#0f172a',
  tooltipBorder: '#334155',
  bmiLine: '#38bdf8',
  actualLine: '#22d3ee',
  predictedLine: '#f97316',
  radarFill: '#06b6d4',
};

const muscleLabelMap: Record<string, string> = {
  back: 'Plecy',
  chest: 'Klatka piersiowa',
  shoulders: 'Barki',
  arms: 'Ręce',
  legs: 'Nogi',
  core: 'Mięśnie brzucha',
  glutes: 'Pośladki',
  neck: 'Szyja',
  traps: 'Czworoboczne',
  calves: 'Łydki',
  'full body': 'Całe ciało',
};

const localizeMuscle = (name: string) => {
  const key = name.trim().toLowerCase()
  return muscleLabelMap[key] ?? name
}

const todayIso = () => new Date().toISOString().split('T')[0];

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightDate, setWeightDate] = useState(todayIso());
  const [weightSubmitting, setWeightSubmitting] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [strengthForm, setStrengthForm] = useState({
    weight: '',
    reps: '',
    date: todayIso(),
  });
  const [strengthSubmitting, setStrengthSubmitting] = useState(false);
  const [strengthError, setStrengthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    progressService
      .fetchStats()
      .then((data) => {
        if (!isMounted) return;
        setStats(data);
        if (data.strengthStats.length) {
          setSelectedExercise((current) => current || data.strengthStats[0].exercise);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Nie uda┼éo si─Ö pobra─ç statystyk post─Öpu.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      return;
    }

    let active = true;
    authService
      .getProfile()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (active) {
          authService.logout();
          setIsAuthenticated(false);
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const applyThemePreference = (theme?: string | null) => {
    if (!theme) return;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (storageError) {
      console.warn('Nie uda┼éo si─Ö zapisa─ç motywu w localStorage', storageError);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: theme }));
    }
  };

  const handleProfileSave = async (changes: ProfileEditableFields) => {
    try {
      const updated = await authService.updateProfile(changes);
      setUser(updated);
      applyThemePreference(updated.themePreference ?? null);
    } catch (profileError) {
      console.error('Nie uda┼éo si─Ö zaktualizowa─ç profilu', profileError);
      throw profileError;
    }
  };

  const handleAvatarUpload = async (avatarDataUrl: string) => {
    await handleProfileSave({ avatarDataUrl });
  };

  const handleThemeSelect = async (theme: string) => {
    await handleProfileSave({ themePreference: theme });
  };

  const handleEmailChange = async (payload: { newEmail: string; currentPassword: string }) => {
    const updated = await authService.updateEmail(payload);
    setUser(updated);
  };

  const handlePasswordChange = async (payload: { newPassword: string; currentPassword: string }) => {
    await authService.updatePassword(payload);
  };

  const selectedStat: StrengthStat | undefined = useMemo(() => {
    if (!stats) return undefined;
    return stats.strengthStats.find((stat) => stat.exercise === selectedExercise);
  }, [stats, selectedExercise]);

  const bmiSparklineData = useMemo(
    () =>
      stats?.bmiHistory.map((entry) => ({
        ...entry,
        label: formatDateLabel(entry.date),
      })) ?? [],
    [stats],
  );

  const bmiTrend = useMemo(() => {
    if (!stats?.bmiHistory.length) return 0;
    const first = stats.bmiHistory[0].value;
    const last = stats.bmiHistory[stats.bmiHistory.length - 1].value;
    return Number((last - first).toFixed(1));
  }, [stats]);

  const strengthChartData: CombinedChartPoint[] = useMemo(() => {
    if (!selectedStat) return [];

    const historical = selectedStat.history.map((point) => ({
      date: point.date,
      actual: point.value,
      predicted: null,
    }));

    const future = selectedStat.prediction.map((point) => ({
      date: point.date,
      actual: null,
      predicted: point.value,
    }));

    return [...historical, ...future];
  }, [selectedStat]);

  const muscleDistributionData: MuscleDistributionEntry[] = useMemo(() => {
    return stats?.muscleDistribution ?? [];
  }, [stats]);
  const localizedMuscleDistribution = useMemo(() => {
    return muscleDistributionData.map((entry) => ({
      ...entry,
      subject: localizeMuscle(entry.subject),
    }));
  }, [muscleDistributionData]);
  const hasActivePlan = stats?.hasActivePlan ?? false;

  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWeightError(null);

    const parsedWeight = Number(weightInput);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setWeightError('Podaj poprawn─ů wag─Ö wi─Öksz─ů od zera.');
      return;
    }

    setWeightSubmitting(true);
    try {
      const payload = { weight: parsedWeight, date: weightDate };
      const response = await progressService.updateWeight(payload);
      setStats((previous) =>
        previous
          ? {
              ...previous,
              currentBMI: response.currentBMI,
              bmiHistory: response.bmiHistory,
            }
          : previous,
      );
      setWeightInput('');
    } catch (requestError) {
      console.error('Failed to update weight', requestError);
      setWeightError('Aktualizacja wagi nie powiod┼éa si─Ö. Spr├│buj ponownie.');
    } finally {
      setWeightSubmitting(false);
    }
  };

  const handleStrengthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStrengthError(null);

    if (!selectedExercise) {
      setStrengthError('Wybierz ─çwiczenie, aby doda─ç rekord.');
      return;
    }

    const parsedWeight = Number(strengthForm.weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setStrengthError('Podaj poprawny ci─Ö┼╝ar wi─Ökszy od zera.');
      return;
    }

    const parsedReps = strengthForm.reps ? Number(strengthForm.reps) : undefined;
    if (parsedReps !== undefined && (!Number.isFinite(parsedReps) || parsedReps <= 0)) {
      setStrengthError('Liczba powt├│rze┼ä musi by─ç wi─Öksza od zera.');
      return;
    }

    setStrengthSubmitting(true);
    try {
      const payload = {
        exercise: selectedExercise,
        weight: parsedWeight,
        reps: parsedReps,
        date: strengthForm.date,
      };
      const response = await progressService.addEntry(payload);
      setStats((previous) => {
        if (!previous) {
          return previous;
        }

        const strengthStats = previous.strengthStats.some(
          (stat) => stat.exercise === response.exercise,
        )
          ? previous.strengthStats.map((stat) =>
              stat.exercise === response.exercise ? response : stat,
            )
          : [...previous.strengthStats, response];

        return {
          ...previous,
          strengthStats,
        };
      });
      setStrengthForm({ weight: '', reps: '', date: todayIso() });
    } catch (requestError) {
      console.error('Failed to add strength entry', requestError);
      setStrengthError('Nie uda┼éo si─Ö doda─ç rekordu. Spr├│buj ponownie.');
    } finally {
      setStrengthSubmitting(false);
    }
  };

  return (
    <div className="bg-base-200 min-h-screen">
      <AppHeader
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onAvatarClick={() => setProfileDrawerOpen(true)}
      />
      <ProfileSidebar
        isOpen={isProfileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        onProfileSave={handleProfileSave}
        onAvatarUpload={handleAvatarUpload}
        onThemeSelect={handleThemeSelect}
        onEmailChange={handleEmailChange}
        onPasswordChange={handlePasswordChange}
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <span className="loading loading-ring loading-lg text-primary" />
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-lg">
            <span>{error}</span>
          </div>
        ) : !stats ? (
          <div className="alert alert-warning shadow-lg">
            <span>Brak danych do wy┼Ťwietlenia.</span>
          </div>
        ) : (
          <>
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">
            Smart Progress Hub
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-base-content">
            Twoje post─Öpy i prognozy si┼éy
          </h1>
          <p className="text-base-content/70 max-w-2xl">
            Aktualne BMI, historia 1RM oraz predykcje AI pomagaj─ů szybko oceni─ç,
            czy zmierzasz w dobr─ů stron─Ö i jakie wyniki mo┼╝esz osi─ůgn─ů─ç w
            nadchodz─ůcych miesi─ůcach.
          </p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-base-content/70">
                  Aktualny wska┼║nik BMI
                </p>
                <div className="flex items-end gap-4 mt-2">
                  <p className="text-5xl font-bold text-base-content">
                    {stats.currentBMI}
                  </p>
                  <span
                    className={`badge ${
                      bmiTrend <= 0 ? 'badge-success' : 'badge-warning'
                    } badge-lg`}
                  >
                    {bmiTrend <= 0 ? 'Stabilizacja' : 'Wzrost'} {bmiTrend}
                  </span>
                </div>
                <p className="mt-2 text-sm text-base-content/60">
                  Ostatnie {stats.bmiHistory.length} miesi─Öcy
                </p>

                <form className="mt-6 space-y-3" onSubmit={handleWeightSubmit}>
                  <p className="text-sm font-semibold text-base-content/70">
                    Zaktualizuj bie┼╝─ůc─ů wag─Ö
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      className="input input-bordered flex-1"
                      placeholder="Waga (kg)"
                      value={weightInput}
                      onChange={(event) => setWeightInput(event.target.value)}
                      required
                    />
                    <input
                      type="date"
                      className="input input-bordered"
                      value={weightDate}
                      onChange={(event) => setWeightDate(event.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={weightSubmitting}
                    >
                      {weightSubmitting ? 'Zapisywanie...' : 'Aktualizuj BMI'}
                    </button>
                  </div>
                  {weightError ? (
                    <p className="text-error text-sm">{weightError}</p>
                  ) : (
                    <p className="text-xs text-base-content/60">
                      Twoje dane pozostaj─ů lokalne na czas sesji demo.
                    </p>
                  )}
                </form>
              </div>
              <div className="h-full">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bmiSparklineData}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="label"
                      stroke={chartColors.axes}
                      tick={{ fill: chartColors.axes }}
                    />
                    <YAxis
                      stroke={chartColors.axes}
                      tick={{ fill: chartColors.axes }}
                      domain={[18, 'auto']}
                    />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)} BMI`}
                      labelFormatter={(label) => label as string}
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: '#f8fafc',
                      }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.bmiLine}
                      strokeWidth={4}
                      dot={{ r: 3, stroke: '#0f172a', strokeWidth: 1 }}
                      activeDot={{ r: 5, stroke: '#0f172a', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-base-content/70">
                  Predykcja si┼éy (1RM)
                </p>
                <h2 className="text-2xl font-bold text-base-content">
                  Prognozowany progres na kolejne 3 miesi─ůce
                </h2>
              </div>
              <select
                className="select select-bordered w-full md:w-60"
                value={selectedExercise}
                onChange={(event) => setSelectedExercise(event.target.value)}
              >
                {stats.strengthStats.map((stat) => (
                  <option key={stat.exercise} value={stat.exercise}>
                    {stat.exercise}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mt-6">
              <div className="rounded-xl border border-base-200 bg-base-200/60 p-5">
                <h3 className="text-lg font-semibold text-base-content mb-4">
                  Dodaj nowy rekord
                </h3>
                <form className="space-y-4" onSubmit={handleStrengthSubmit}>
                  <div className="form-control">
                    <label className="label" htmlFor="weightInput">
                      <span className="label-text">Ci─Ö┼╝ar (kg)</span>
                    </label>
                    <input
                      id="weightInput"
                      type="number"
                      step="0.5"
                      min="1"
                      className="input input-bordered w-full"
                      value={strengthForm.weight}
                      onChange={(event) =>
                        setStrengthForm((form) => ({ ...form, weight: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label" htmlFor="repsInput">
                      <span className="label-text">
                        Powt├│rzenia (opcjonalnie, pomo┼╝e policzy─ç 1RM)
                      </span>
                    </label>
                    <input
                      id="repsInput"
                      type="number"
                      min="1"
                      className="input input-bordered w-full"
                      value={strengthForm.reps}
                      onChange={(event) =>
                        setStrengthForm((form) => ({ ...form, reps: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label" htmlFor="dateInput">
                      <span className="label-text">Data</span>
                    </label>
                    <input
                      id="dateInput"
                      type="date"
                      className="input input-bordered w-full"
                      value={strengthForm.date}
                      onChange={(event) =>
                        setStrengthForm((form) => ({ ...form, date: event.target.value }))
                      }
                      required
                    />
                  </div>
                  {strengthError && (
                    <p className="text-sm text-error">{strengthError}</p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-secondary w-full"
                    disabled={strengthSubmitting}
                  >
                    {strengthSubmitting ? 'Analizuj─Ö...' : 'Przelicz predykcj─Ö'}
                  </button>
                  <p className="text-xs text-base-content/60">
                    Ka┼╝dy nowy pomiar aktualizuje lini─Ö trendu AI.
                  </p>
                </form>
              </div>
              <div className="lg:col-span-2 h-full">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={strengthChartData}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      stroke={chartColors.axes}
                      tick={{ fill: chartColors.axes }}
                    />
                    <YAxis
                      stroke={chartColors.axes}
                      tick={{ fill: chartColors.axes }}
                      domain={['auto', 'auto']}
                      label={{
                        value: 'Szacowany 1RM (kg)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: chartColors.axes },
                      }}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatDateLabel(label as string)}
                      formatter={strengthTooltipFormatter}
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: '#f8fafc',
                      }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Line
                      type="monotone"
                      name="Historia"
                      dataKey="actual"
                      stroke={chartColors.actualLine}
                      strokeWidth={4}
                      dot={{ r: 4, stroke: '#0f172a', strokeWidth: 1 }}
                      activeDot={{ r: 6, stroke: '#0f172a', strokeWidth: 2 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      name="Prognoza AI"
                      dataKey="predicted"
                      stroke={chartColors.predictedLine}
                      strokeWidth={3}
                      strokeDasharray="8 6"
                      dot={{ r: 4, stroke: '#0f172a', strokeWidth: 1 }}
                      activeDot={{ r: 6, stroke: '#0f172a', strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase text-base-content/70">
                Analiza balansu mi─Ö┼Ťniowego
              </p>
              <h2 className="text-2xl font-bold text-base-content">
                Analiza Twojego aktywnego planu
              </h2>
              <p className="text-base-content/70">
                Radar pokazuje, jak aktualny plan rozk┼éada akcenty na grupy mi─Ö┼Ťniowe.
              </p>
            </div>
            {!hasActivePlan ? (
              <div className="mt-6 rounded-xl border border-dashed border-base-300 p-6 text-base-content/80 flex flex-col gap-4">
                <p>Nie masz jeszcze aktywnego planu treningowego.</p>
                <Link to="/workout-plans" className="btn btn-primary w-fit">
                  Wybierz plan treningowy
                </Link>
              </div>
            ) : localizedMuscleDistribution.length ? (
              <div className="mt-6 h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={localizedMuscleDistribution} outerRadius="80%">
                    <PolarGrid stroke="#e5e7eb" strokeDasharray="4 4" strokeOpacity={0.2} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#f8fafc', fontSize: 14, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: chartColors.axes }}
                      stroke={chartColors.axes}
                    />
                    <Radar
                      name="Aktywno┼Ť─ç"
                      dataKey="A"
                      stroke={chartColors.radarFill}
                      strokeWidth={3}
                      fill={chartColors.radarFill}
                      fillOpacity={0.6}
                      dot={{ r: 4, fill: '#ffffff', stroke: chartColors.radarFill, strokeWidth: 2 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <PlanFocusSummary data={localizedMuscleDistribution} />
              </div>
            ) : (
              <div className="alert alert-info mt-6">
                <span>Tw├│j aktywny plan nie zawiera jeszcze ─çwicze┼ä z przypisanymi partiami mi─Ö┼Ťniowymi.</span>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}

type PlanFocusSummaryProps = {
  data: MuscleDistributionEntry[];
};

const dominantCopy: Record<string, { label: string; description: string }> = {
  'Plecy': {
    label: 'Plecy',
    description: 'Tw├│j plan skupia si─Ö na budowie si┼éy tylnej ta┼Ťmy.',
  },
  'Klatka piersiowa': {
    label: 'Klatka piersiowa',
    description: 'Plan nastawiony na si┼é─Ö pchaj─ůc─ů (Push).',
  },
  'Barki': {
    label: 'Barki',
    description: 'Priorytetem s─ů stabilno┼Ť─ç i si┼éa obr─Öczy barkowej.',
  },
  'R─Öce': {
    label: 'R─Öce',
    description: 'Du┼╝o pracy nad bicepsami i tricepsami.',
  },
  'Nogi': {
    label: 'Nogi',
    description: 'Dominuj─ů przysiady, martwe ci─ůgi i ruchy si┼éowe dolnej cz─Ö┼Ťci cia┼éa.',
  },
  'Mi─Ö┼Ťnie brzucha': {
    label: 'Mi─Ö┼Ťnie brzucha',
    description: 'Program mocno akcentuje stabilizacj─Ö i kontrol─Ö core.',
  },
  'Po┼Ťladki': {
    label: 'Po┼Ťladki',
    description: 'Plan wzmacnia biodra i nap─Öd w ruchach hip-hinge.',
  },
  'Ca┼ée cia┼éo': {
    label: 'Ca┼ée cia┼éo',
    description: 'Elementy full-body buduj─ů wszechstronn─ů form─Ö.',
  },
};

const VerdictIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

function PlanFocusSummary({ data }: PlanFocusSummaryProps) {
  if (!data.length) {
    return null;
  }

  const sorted = [...data].sort((a, b) => b.A - a.A);
  const [leader, runnerUp] = sorted;
  const delta = runnerUp ? leader.A - runnerUp.A : leader.A;
  const isBalanced = delta <= 5;

  if (isBalanced) {
    return (
      <div className="mt-5 rounded-2xl border border-base-300 bg-base-100/70 p-4 text-base-content/80 flex items-start gap-3 shadow-inner">
        <VerdictIcon className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Werdykt Trenera
          </p>
          <p className="text-base font-medium text-base-content">Tw├│j plan jest zr├│wnowa┼╝ony.</p>
          <p className="text-sm text-base-content/70">Ka┼╝da partia mi─Ö┼Ťniowa otrzymuje podobn─ů obj─Öto┼Ť─ç.</p>
        </div>
      </div>
    );
  }

  const copy = dominantCopy[leader.subject] ?? {
    label: leader.subject,
    description: 'Plan akcentuje t─Ö grup─Ö mi─Ö┼Ťniow─ů bardziej ni┼╝ pozosta┼ée.',
  };

  return (
    <div className="mt-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-base-100 to-base-100 p-4 text-base-content flex items-start gap-3 shadow-lg">
      <VerdictIcon className="h-6 w-6 text-primary mt-0.5" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Werdykt Trenera
        </p>
        <p className="text-base font-semibold">
          Dominuj─ůca partia: <span className="text-primary">{copy.label}</span>
        </p>
        <p className="text-sm text-base-content/80">{copy.description}</p>
      </div>
    </div>
  );
}
