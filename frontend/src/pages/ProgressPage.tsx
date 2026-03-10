import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  CartesianGrid,
  Legend,
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
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { isAxiosError } from 'axios';
import AppHeader from '../components/AppHeader';
import ProfileSidebar from './home/components/ProfileSidebar';
import type {
  AuthenticatedUser,
  ProfileEditableFields,
} from './home/models/user.model';
import { authService } from '../services/auth.service';
import type {
  MuscleDistributionEntry,
  PredictionHorizon,
  ProgressStatsResponse,
  StrengthStat,
} from '../services/progress.service';
import { progressService } from '../services/progress.service';
import exercisesData from '../data/exercises.json';
import {
  buildExerciseCatalog,
  defaultExerciseSuggestions,
  getExerciseSuggestions,
  normalizeText,
  type ExerciseCatalogItem,
} from './ProgressPage.helpers';

interface CombinedChartPoint {
  date: string;
  actual: number | null;
  movingAverage: number | null;
  predicted: number | null;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  confidenceSpan: number | null;
}

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString('pl-PL', {
    month: 'short',
    year: 'numeric',
  });

const chartColors = {
  axes: '#94a3b8',
  grid: '#1e2738',
  tooltipBg: '#0f172a',
  tooltipBorder: '#334155',
  bmiLine: '#38bdf8',
  actualLine: '#22d3ee',
  movingAverageLine: '#a855f7',
  predictedLine: '#f97316',
  confidenceFill: 'rgba(14,116,144,0.25)',
  radarUser: '#22d3ee',
  radarIdeal: '#fbbf24',
  radarGrid: '#374151',
};

const muscleLabelMap: Record<string, string> = {
  Back: 'Plecy',
  Chest: 'Klatka piersiowa',
  Shoulders: 'Barki',
  Arms: 'Ręce',
  Legs: 'Nogi',
  Core: 'Mięśnie brzucha',
  Glutes: 'Pośladki',
  Neck: 'Szyja',
  Traps: 'Czworoboczne',
  Calves: 'Łydki',
  "Full Body": 'Całe ciało',
};

const predictionOptions: Array<{ value: PredictionHorizon; label: string; helper: string }> = [
  { value: 1, label: '1 m-c', helper: 'Krótki horyzont' },
  { value: 3, label: '3 m-ce', helper: 'Standard' },
  { value: 6, label: '6 m-cy', helper: 'Długoterminowo' },
];

const getBMIStatus = (bmi: number) => {
  if (bmi < 18.5) {
    return {
      label: 'Niedowaga',
      color: 'alert-warning',
      tip: 'Skup się na nadwyżce kalorycznej.',
    };
  }
  if (bmi < 25) {
    return {
      label: 'Waga prawidłowa',
      color: 'alert-success',
      tip: 'Utrzymuj obecny trend.',
    };
  }
  if (bmi < 30) {
    return {
      label: 'Nadwaga',
      color: 'alert-warning',
      tip: 'Rozważ lekki deficyt.',
    };
  }
  return {
    label: 'Otyłość',
    color: 'alert-error',
    tip: 'Zalecana konsultacja dietetyczna.',
  };
};

const todayIso = () => new Date().toISOString().split('T')[0];

const extractApiErrorMessage = (error: unknown): string | null => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : null;
  }

  const payload = error.response?.data;
  if (typeof payload === 'string') {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0];
    }
  }
  return error.message ?? null;
};

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStatsResponse | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedHorizon, setSelectedHorizon] = useState<PredictionHorizon>(3);
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
  const [resettingExercise, setResettingExercise] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const strengthFormRef = useRef<HTMLDivElement | null>(null);
  const [isAddExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseError, setExerciseError] = useState<string | null>(null);

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
        setError('Nie udało się pobrać statystyk postępu.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const exerciseCatalog = useMemo(
    () => buildExerciseCatalog(exercisesData as ExerciseCatalogItem[]),
    [],
  );

  const exerciseSuggestions = useMemo(
    () => getExerciseSuggestions(exerciseCatalog, exerciseQuery, defaultExerciseSuggestions),
    [exerciseCatalog, exerciseQuery],
  );

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

  useEffect(() => {
    if (!stats?.strengthStats.length) {
      setSelectedExercise('');
      return;
    }

    setSelectedExercise((current) => {
      if (current && stats.strengthStats.some((stat) => stat.exercise === current)) {
        return current;
      }
      return stats.strengthStats[0].exercise;
    });
  }, [stats?.strengthStats]);

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
      console.warn('Nie udało się zapisać motywu w localStorage', storageError);
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
      console.error('Nie udało się zaktualizować profilu', profileError);
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

  const scrollToStrengthForm = useCallback(() => {
    if (!strengthFormRef.current) return;
    strengthFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const focusable = strengthFormRef.current.querySelector<HTMLInputElement | HTMLSelectElement>(
      'input, select',
    );
    focusable?.focus();
  }, []);

  const handleSeedDemoData = useCallback(async () => {
    setSeedError(null);
    setSeedLoading(true);
    try {
      const seededStats = await progressService.seedMockData();
      setStats(seededStats);
      if (seededStats.strengthStats.length) {
        setSelectedExercise(seededStats.strengthStats[0].exercise);
      }
    } catch (seedException) {
      console.error('Nie udało się załadować danych demo', seedException);
      const fallback = 'Nie udało się załadować danych demo. Spróbuj ponownie.';
      setSeedError(extractApiErrorMessage(seedException) ?? fallback);
    } finally {
      setSeedLoading(false);
    }
  }, []);

  const selectedStat: StrengthStat | undefined = useMemo(() => {
    if (!stats?.strengthStats.length) return undefined;
    return (
      stats.strengthStats.find((stat) => stat.exercise === selectedExercise) ??
      stats.strengthStats[0]
    );
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

    const pointMap = new Map<string, CombinedChartPoint>();
    const ensurePoint = (date: string) => {
      if (!pointMap.has(date)) {
        pointMap.set(date, {
          date,
          actual: null,
          movingAverage: null,
          predicted: null,
          confidenceLower: null,
          confidenceUpper: null,
          confidenceSpan: null,
        });
      }
      return pointMap.get(date)!;
    };

    selectedStat.history.forEach((point) => {
      const entry = ensurePoint(point.date);
      entry.actual = point.value;
    });

    selectedStat.movingAverage.forEach((point) => {
      const entry = ensurePoint(point.date);
      entry.movingAverage = point.value;
    });

    const horizonPoints = selectedStat.predictions[selectedHorizon] ?? [];
    horizonPoints.forEach((point) => {
      const entry = ensurePoint(point.date);
      entry.predicted = point.value;
      entry.confidenceLower = point.lowerBound;
      entry.confidenceUpper = point.upperBound;
      entry.confidenceSpan = point.upperBound - point.lowerBound;
    });

    return Array.from(pointMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [selectedStat, selectedHorizon]);

  const muscleDistributionData: MuscleDistributionEntry[] = useMemo(() => {
    return stats?.muscleDistribution ?? [];
  }, [stats]);
  const localizedMuscleDistribution = useMemo(() => {
    return muscleDistributionData.map((entry) => ({
      ...entry,
      subject: muscleLabelMap[entry.subject] ?? entry.subject,
    }));
  }, [muscleDistributionData]);
  const hasActivePlan = stats?.hasActivePlan ?? false;
  const hasBmiData = (stats?.bmiHistory.length ?? 0) > 0;
  const hasBmiChartData = (stats?.bmiHistory.length ?? 0) > 1; // wykres dopiero od 2 punktów

  const fallbackBmi = useMemo(() => {
    if (hasBmiData) return null;
    const height = user?.heightCm;
    const weight = user?.weightKg;
    if (!height || !weight) return null;
    const bmi = weight / Math.pow(height / 100, 2);
    return Number(bmi.toFixed(1));
  }, [hasBmiData, user?.heightCm, user?.weightKg]);

  const displayedBmi = hasBmiData ? stats?.currentBMI : fallbackBmi;
  const hasStrengthData = (stats?.strengthStats.length ?? 0) > 0;

  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWeightError(null);

    const parsedWeight = Number(weightInput);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setWeightError('Podaj poprawną wagę większą od zera.');
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
      const fallback = 'Aktualizacja wagi nie powiodła się. Spróbuj ponownie.';
      setWeightError(extractApiErrorMessage(requestError) ?? fallback);
    } finally {
      setWeightSubmitting(false);
    }
  };

  const handleStrengthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStrengthError(null);

    const exerciseName = selectedExercise.trim();
    if (!exerciseName) {
      setStrengthError('Wybierz ćwiczenie, aby dodać rekord.');
      return;
    }

    const parsedWeight = Number(strengthForm.weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setStrengthError('Podaj poprawny ciężar większy od zera.');
      return;
    }

    const parsedReps = strengthForm.reps ? Number(strengthForm.reps) : undefined;
    if (parsedReps !== undefined && (!Number.isFinite(parsedReps) || parsedReps <= 0)) {
      setStrengthError('Liczba powtórzeń musi być większa od zera.');
      return;
    }

    const sendRequest = async (forceOverride: boolean) => {
      const payload = {
        exercise: exerciseName,
        weight: parsedWeight,
        reps: parsedReps,
        date: strengthForm.date,
        force: forceOverride ? true : undefined,
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
      setSelectedExercise(response.exercise);
      setStrengthForm({ weight: '', reps: '', date: todayIso() });
    };

    setStrengthSubmitting(true);
    try {
      await sendRequest(false);
      return;
    } catch (requestError) {
      console.error('Failed to add strength entry', requestError);
      const fallback = 'Nie udało się dodać rekordu. Spróbuj ponownie.';
      if (isAxiosError(requestError) && requestError.response?.status === 409) {
        const confirmationMessage =
          'Ten wynik jest znacznie wyższy od Twojej średniej. Czy na pewno chcesz go zapisać?';
        const shouldForce =
          typeof window !== 'undefined' ? window.confirm(confirmationMessage) : false;
        if (shouldForce) {
          try {
            await sendRequest(true);
            return;
          } catch (forceError) {
            console.error('Forced strength entry failed', forceError);
            setStrengthError(extractApiErrorMessage(forceError) ?? fallback);
            return;
          }
        } else {
          setStrengthError('Zapis wyniku został anulowany.');
          return;
        }
      }
      setStrengthError(extractApiErrorMessage(requestError) ?? fallback);
    } finally {
      setStrengthSubmitting(false);
    }
  };

  const handleCreateCustomExercise = () => {
    setExerciseQuery(selectedExercise || '');
    setExerciseError(null);
    setAddExerciseOpen(true);
  };

  const handleConfirmExercise = () => {
    const query = exerciseQuery.trim();
    if (!query) {
      setExerciseError('Wpisz nazwę ćwiczenia.');
      return;
    }

    const normalizedQuery = normalizeText(query);
    const match = exerciseCatalog.find((name) => normalizeText(name) === normalizedQuery);

    if (!match) {
      setExerciseError('Wybierz ćwiczenie z listy podpowiedzi.');
      return;
    }

    setSelectedExercise(match);
    setExerciseError(null);
    setAddExerciseOpen(false);
  };

  const handleResetExerciseHistory = async () => {
    if (!selectedExercise) {
      setStrengthError('Wybierz ćwiczenie, aby wyzerować historię.');
      return;
    }

    const confirmationMessage = `Wyzerować historię ćwiczenia "${selectedExercise}"?`;
    const confirmed =
      typeof window === 'undefined' ? true : window.confirm(confirmationMessage);
    if (!confirmed) {
      return;
    }

    setStrengthError(null);
    setResettingExercise(true);
    try {
      const updatedStats = await progressService.resetExerciseHistory(selectedExercise);
      setStats(updatedStats);
    } catch (resetError) {
      console.error('Failed to reset exercise history', resetError);
      const fallback = 'Nie udało się wyzerować historii ćwiczenia.';
      setStrengthError(extractApiErrorMessage(resetError) ?? fallback);
    } finally {
      setResettingExercise(false);
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
            <span>Brak danych do wyświetlenia.</span>
          </div>
        ) : (
          <>
        <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col gap-3 text-base-content">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Smart Progress Hub
            </p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Twoje postępy i prognozy siły
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-base-content/80">
              Aktualne BMI, historia 1RM oraz predykcje AI pomagają szybko ocenić, czy zmierzasz w dobrą stronę i jakie wyniki możesz osiągnąć w nadchodzących miesiącach.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-base-content/80">
              <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm ring-1 ring-primary/10">Aktualne BMI i 1RM</span>
              <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm ring-1 ring-primary/10">Predykcje AI</span>
              <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm ring-1 ring-primary/10">Trendy i alerty</span>
            </div>
          </div>
        </section>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-base-content/70">
                  Aktualny wskaźnik BMI
                </p>
                {displayedBmi !== null && displayedBmi !== undefined ? (
                  <>
                    <div className="flex items-end gap-4 mt-2">
                      <p className="text-5xl font-bold text-base-content">
                        {displayedBmi}
                      </p>
                      {hasBmiData && (
                        <span
                          className={`badge ${
                            bmiTrend <= 0 ? 'badge-success' : 'badge-warning'
                          } badge-lg`}
                        >
                          {bmiTrend <= 0 ? 'Stabilizacja' : 'Wzrost'} {bmiTrend}
                        </span>
                      )}
                    </div>
                    {hasBmiData && (
                      <p className="mt-2 text-sm text-base-content/60">
                        Ostatnie {stats.bmiHistory.length} miesięcy
                      </p>
                    )}
                    {(() => {
                      const status = getBMIStatus(displayedBmi);
                      return (
                        <div className={`alert ${status.color} mt-4 shadow-sm`}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="stroke-current shrink-0 w-6 h-6"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                          </svg>
                          <div>
                            <h3 className="font-bold">{status.label}</h3>
                            <div className="text-xs">{status.tip}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-base-300 bg-base-200/50 p-4 text-base-content/80">
                    Brak danych wagi. Uzupełnij wagę w profilu lub dodaj nowy pomiar.
                  </div>
                )}

                <form className="mt-6 space-y-3" onSubmit={handleWeightSubmit}>
                  <p className="text-sm font-semibold text-base-content/70">
                    Zaktualizuj bieżącą wagę
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Waga (kg)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="300"
                        className="input input-bordered w-full"
                        placeholder="np. 75.5"
                        value={weightInput}
                        onChange={(event) => setWeightInput(event.target.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Data pomiaru</span>
                      </label>
                      <input
                        type="date"
                        className="input input-bordered w-full"
                        value={weightDate}
                        onChange={(event) => setWeightDate(event.target.value)}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text opacity-0">Akcja</span>
                      </label>
                      <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={weightSubmitting}
                      >
                        {weightSubmitting ? 'Zapisywanie...' : 'Aktualizuj BMI'}
                      </button>
                    </div>
                  </div>
                  {weightError ? (
                    <p className="text-error text-sm">{weightError}</p>
                  ) : (
                    <p className="text-xs text-base-content/60">
                      Twoje dane pozostają lokalne na czas sesji demo.
                    </p>
                  )}
                </form>
              </div>
              <div className="h-full">
                {hasBmiChartData ? (
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
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-base-300 text-base-content/70 px-6 text-center">
                    Dodaj więcej informacji, żeby wyświetlić wykres BMI.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-base-content/70">
                  Predykcja siły (1RM)
                </p>
                <h2 className="text-2xl font-bold text-base-content">
                  Inteligentne prognozy Twoich rekordów
                </h2>
                <p className="text-base-content/70">
                  Wybierz ćwiczenie i horyzont czasowy, aby zobaczyć, gdzie zaprowadzi Cię bieżący trend.
                </p>
              </div>
              <div className="flex w-full flex-col gap-4 md:w-auto md:items-end">
                <div className="flex w-full flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    Śledzone ćwiczenie
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      className="select select-bordered w-full md:w-60"
                      value={selectedExercise}
                      onChange={(event) => {
                        setSelectedExercise(event.target.value);
                      }}
                      disabled={!hasStrengthData && !selectedExercise}
                    >
                      {!hasStrengthData && !selectedExercise && (
                        <option value="" disabled>
                          Brak zapisanych ćwiczeń
                        </option>
                      )}
                      {stats?.strengthStats?.map((stat) => (
                        <option key={stat.exercise} value={stat.exercise}>
                          {stat.exercise}
                        </option>
                      ))}
                      {selectedExercise &&
                        !(stats?.strengthStats ?? []).some(
                          (stat) => stat.exercise === selectedExercise,
                        ) && (
                          <option value={selectedExercise}>{selectedExercise} (nowe)</option>
                        )}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleCreateCustomExercise}
                    >
                      Dodaj ćwiczenie
                    </button>
                  </div>
                  {!hasStrengthData && (
                    <p className="text-xs text-base-content/60">
                      Nie masz jeszcze zapisanych ćwiczeń — dodaj nowe powyżej lub wczytaj dane demo.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
                    Horyzont prognozy
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {predictionOptions.map((option) => {
                      const isActive = option.value === selectedHorizon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'border-primary bg-primary text-primary-content shadow-lg'
                              : 'border-base-300 bg-base-200/60 text-base-content/80 hover:border-base-200'
                          }`}
                          onClick={() => setSelectedHorizon(option.value)}
                          aria-pressed={isActive}
                        >
                          <p className="text-sm font-semibold leading-none">{option.label}</p>
                          <p className="text-[11px] opacity-80">{option.helper}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mt-6">
              <div className="rounded-xl border border-base-200 bg-base-200/60 p-5" ref={strengthFormRef}>
                <h3 className="text-lg font-semibold text-base-content mb-4">
                  Dodaj nowy rekord
                </h3>
                <form className="space-y-4" onSubmit={handleStrengthSubmit}>
                  <div className="form-control">
                    <label className="label" htmlFor="weightInput">
                      <span className="label-text">Ciężar (kg)</span>
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
                        Powtórzenia (opcjonalnie)
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
                    {strengthSubmitting ? 'Analizuję...' : 'Przelicz predykcję'}
                  </button>
                  <p className="text-xs text-base-content/60">
                    Każdy nowy pomiar aktualizuje linię trendu AI.
                  </p>
                  <button
                    type="button"
                    className="btn btn-error btn-outline w-full"
                    onClick={handleResetExerciseHistory}
                    disabled={resettingExercise || !selectedExercise}
                  >
                    {resettingExercise ? 'Czyszczę historię...' : 'Wyzeruj historię ćwiczenia'}
                  </button>
                </form>
              </div>
              <div className="lg:col-span-2 h-full">
                {hasStrengthData && selectedStat ? (
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
                        cursor={{ strokeDasharray: '4 4', stroke: chartColors.axes }}
                        content={(props) => (
                          <StrengthTooltip {...props} horizon={selectedHorizon} />
                        )}
                      />
                      <Legend
                        wrapperStyle={{ color: '#f8fafc' }}
                        iconType="circle"
                        verticalAlign="top"
                        height={36}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidenceLower"
                        stackId="confidence"
                        stroke="none"
                        fill="transparent"
                        activeDot={false}
                        legendType="none"
                        isAnimationActive={false}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        name="Pasmo ufności"
                        dataKey="confidenceSpan"
                        stackId="confidence"
                        stroke="none"
                        fill={chartColors.confidenceFill}
                        activeDot={false}
                        isAnimationActive={false}
                        connectNulls
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
                        name="Średnia krocząca"
                        dataKey="movingAverage"
                        stroke={chartColors.movingAverageLine}
                        strokeWidth={3}
                        dot={false}
                        activeDot={false}
                        connectNulls
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
                ) : (
                  <StrengthChartEmptyState
                    onAddClick={scrollToStrengthForm}
                    onSeedClick={handleSeedDemoData}
                    seedLoading={seedLoading}
                    seedError={seedError}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase text-base-content/70">
                Analiza balansu mięśniowego
              </p>
              <h2 className="text-2xl font-bold text-base-content">
                Analiza Twojego aktywnego planu
              </h2>
              <p className="text-base-content/70">
                Radar pokazuje, jak aktualny plan rozkłada akcenty na grupy mięśniowe.
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
                <div className="h-full w-full text-base-content">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={localizedMuscleDistribution} outerRadius="80%">
                      <PolarGrid
                        stroke={chartColors.radarGrid}
                        strokeOpacity={0.5}
                      />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                        tickLine={false}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        stroke="#475569"
                        strokeOpacity={0.5}
                      />
                      <Radar
                        name="Twój plan"
                        dataKey="A"
                        stroke={chartColors.radarUser}
                        strokeWidth={3}
                        fill={chartColors.radarUser}
                        fillOpacity={0.6}
                        dot={{
                          r: 4,
                          fill: '#0f172a',
                          stroke: chartColors.radarUser,
                          strokeWidth: 2,
                        }}
                      />
                      <Radar
                        name="Idealny profil"
                        dataKey="B"
                        stroke={chartColors.radarIdeal}
                        strokeWidth={2}
                        fill="transparent"
                        fillOpacity={0}
                        dot={false}
                        activeDot={false}
                      />
                    <Tooltip
                      formatter={(value, name) => {
                        if (typeof value !== 'number') {
                          return ['-', name];
                        }
                        const label = name === 'Twój plan' ? 'Twój plan' : 'Idealny profil';
                        return [`${value.toFixed(1)}%`, label];
                      }}
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        color: '#f8fafc',
                      }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Legend
                      wrapperStyle={{ color: 'var(--bc)' }}
                      iconType="circle"
                      verticalAlign="bottom"
                    />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <PlanFocusSummary data={localizedMuscleDistribution} />
              </div>
            ) : (
              <div className="alert alert-info mt-6">
                <span>Twój aktywny plan nie zawiera jeszcze ćwiczeń z przypisanymi partiami mięśniowymi.</span>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </main>

      {isAddExerciseOpen && (
        <div className="modal modal-open">
          <div className="modal-box space-y-4">
            <h3 className="font-bold text-lg">Dodaj ćwiczenie</h3>
            <p className="text-sm text-base-content/70">
              Wpisz nazwę ćwiczenia i wybierz jedną z podpowiedzi z bazy smart exercises.
            </p>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="np. Wyciskanie hantlami"
              value={exerciseQuery}
              onChange={(event) => {
                setExerciseQuery(event.target.value);
                setExerciseError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirmExercise();
                }
              }}
            />

            <div className="space-y-2">
              <p className="text-[12px] uppercase font-semibold text-base-content/60">Propozycje</p>
              <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                {exerciseSuggestions.length === 0 && (
                  <p className="text-sm text-base-content/60">Brak propozycji dla tego zapytania.</p>
                )}
                {exerciseSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`btn btn-ghost btn-sm justify-start text-left ${
                      normalizeText(name) === normalizeText(exerciseQuery)
                        ? 'bg-base-200'
                        : ''
                    }`}
                    onClick={() => {
                      setExerciseQuery(name);
                      setExerciseError(null);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {exerciseError && <p className="text-error text-sm">{exerciseError}</p>}

            <div className="modal-action flex gap-2">
              <button className="btn btn-primary" type="button" onClick={handleConfirmExercise}>
                OK
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setAddExerciseOpen(false);
                  setExerciseError(null);
                }}
              >
                Anuluj
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setAddExerciseOpen(false)} />
        </div>
      )}
    </div>
  );
}

type PlanFocusSummaryProps = {
  data: MuscleDistributionEntry[];
};

const dominantCopy: Record<string, { label: string; description: string }> = {
  'Plecy': {
    label: 'Plecy',
    description: 'Twój plan skupia się na budowie siły tylnej taśmy.',
  },
  'Klatka piersiowa': {
    label: 'Klatka piersiowa',
    description: 'Plan nastawiony na siłę pchającą (Push).',
  },
  'Barki': {
    label: 'Barki',
    description: 'Priorytetem są stabilność i siła obręczy barkowej.',
  },
  'Ręce': {
    label: 'Ręce',
    description: 'Dużo pracy nad bicepsami i tricepsami.',
  },
  'Nogi': {
    label: 'Nogi',
    description: 'Dominują przysiady, martwe ciągi i ruchy siłowe dolnej części ciała.',
  },
  'Mięśnie brzucha': {
    label: 'Mięśnie brzucha',
    description: 'Program mocno akcentuje stabilizację i kontrolę core.',
  },
  'Pośladki': {
    label: 'Pośladki',
    description: 'Plan wzmacnia biodra i napęd w ruchach hip-hinge.',
  },
  'Całe ciało': {
    label: 'Całe ciało',
    description: 'Elementy full-body budują wszechstronną formę.',
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

type StrengthTooltipProps = TooltipProps<ValueType, NameType> & {
  horizon: PredictionHorizon;
};

function StrengthTooltip({ active, label, payload, horizon }: StrengthTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const allowedKeys = new Set(['actual', 'movingAverage', 'predicted']);
  const rows = payload
    .filter((entry) => allowedKeys.has(String(entry.dataKey)))
    .map((entry) => {
      if (typeof entry.value !== 'number') {
        return null;
      }
      const key = String(entry.dataKey);
      const labelMap: Record<string, string> = {
        actual: 'Historia',
        movingAverage: 'Średnia krocząca',
        predicted: 'Prognoza AI',
      };
      return {
        key,
        label: labelMap[key] ?? key,
        value: entry.value,
        color: entry.color ?? '#f8fafc',
      };
    })
    .filter((entry): entry is { key: string; label: string; value: number; color: string } =>
      Boolean(entry),
    );

  if (!rows.length) {
    return null;
  }

  const targetDay = label ? formatDateLabel(String(label)) : '';
  const horizonLabel =
    predictionOptions.find((option) => option.value === horizon)?.label ?? `${horizon} m-cy`;

  return (
    <div className="rounded-xl border border-base-300 bg-slate-900/95 px-3 py-2 text-xs text-slate-50 shadow-xl">
      <p className="mb-2 text-sm font-semibold">{targetDay}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
              {row.label}
            </span>
            <span className="font-semibold">{row.value.toFixed(1)} kg</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-300">
        Horyzont: {horizonLabel}
      </p>
    </div>
  );
}

function PlanFocusSummary({ data }: PlanFocusSummaryProps) {
  if (!data.length) {
    return null;
  }

  const sorted = [...data].sort((a, b) => b.A - a.A);
  const [leader, runnerUp] = sorted;
  const delta = runnerUp ? leader.A - runnerUp.A : leader.A;
  const maxDeviation = data.reduce(
    (highest, entry) => Math.max(highest, Math.abs(entry.A - entry.B)),
    0,
  );
  const isBalanced = delta <= 5;

  if (isBalanced) {
    return (
      <div className="mt-5 rounded-2xl border border-base-300 bg-base-100/70 p-4 text-base-content/80 flex items-start gap-3 shadow-inner">
        <VerdictIcon className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Werdykt Trenera
          </p>
          <p className="text-base font-medium text-base-content">Twój plan jest zrównoważony.</p>
          <p className="text-sm text-base-content/70">
            Różnice pomiędzy partiami są minimalne (max {maxDeviation.toFixed(1)} p.p. odchylenia).
          </p>
        </div>
      </div>
    );
  }

  const copy = dominantCopy[leader.subject] ?? {
    label: leader.subject,
    description: 'Plan akcentuje tę grupę mięśniową bardziej niż pozostałe.',
  };
  const deviation = leader.A - leader.B;

  return (
    <div className="mt-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-base-100 to-base-100 p-4 text-base-content flex items-start gap-3 shadow-lg">
      <VerdictIcon className="h-6 w-6 text-primary mt-0.5" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Werdykt Trenera
        </p>
        <p className="text-base font-semibold">
          Dominująca partia: <span className="text-primary">{copy.label}</span>
        </p>
        <p className="text-sm text-base-content/80">{copy.description}</p>
        <p className="text-xs text-base-content/60 mt-1">
          Twój plan: {leader.A.toFixed(1)}% · Idealny profil: {leader.B.toFixed(1)}% ({
            deviation >= 0 ? '+' : ''
          }
          {deviation.toFixed(1)} p.p.)
        </p>
      </div>
    </div>
  );
}

type StrengthChartEmptyStateProps = {
  onAddClick: () => void;
  onSeedClick: () => void | Promise<void>;
  seedLoading: boolean;
  seedError: string | null;
};

function StrengthChartEmptyState({
  onAddClick,
  onSeedClick,
  seedLoading,
  seedError,
}: StrengthChartEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/40 p-8 text-center">
      <p className="text-lg font-semibold text-base-content">
        Nie masz jeszcze wystarczającej ilości danych, aby wygenerować predykcję.
      </p>
      <p className="mt-2 text-base text-base-content/70">
        Dodaj ręcznie pierwszy wynik lub wczytaj przykładowy zestaw danych demo.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn btn-outline" onClick={onAddClick}>
          Dodaj nowy wynik
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSeedClick}
          disabled={seedLoading}
        >
          {seedLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Wczytuję...
            </>
          ) : (
            'Załaduj dane przykładowe (Demo)'
          )}
        </button>
      </div>
      {seedError && <p className="mt-3 text-sm text-error">{seedError}</p>}
    </div>
  );
}
