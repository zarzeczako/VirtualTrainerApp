import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THEMES } from '../../../components/theme-options';
import { getExperienceLabel } from '../../../constants/experience-levels';
import {
  PROFILE_PLACEHOLDER,
  type AuthenticatedUser,
  type ProfileEditableFields,
  getDisplayName,
} from '../models/user.model';

const AVATAR_MAX_BYTES = 1024 * 1024 * 2; // 2 MB
const DARK_THEMES = new Set([
  'dark',
  'black',
  'luxury',
  'business',
  'dracula',
  'night',
  'sunset',
  'halloween',
  'forest',
  'coffee',
  'dim',
  'cyberpunk',
  'synthwave',
]);

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  name: string;
  city: string;
  goal: string;
  experienceLevel: string;
  weightKg: string;
  heightCm: string;
  workoutsPerWeekTarget: string;
  bio: string;
  birthDate: string;
};

type ProfileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  onProfileSave: (data: ProfileEditableFields) => Promise<void>;
  onAvatarUpload: (avatarDataUrl: string) => Promise<void>;
  onThemeSelect: (theme: string) => Promise<void>;
  onEmailChange: (data: { newEmail: string; currentPassword: string }) => Promise<void>;
  onPasswordChange: (data: { newPassword: string; currentPassword: string }) => Promise<void>;
};

const toProfileForm = (source: AuthenticatedUser | null): ProfileFormState => ({
  firstName: source?.firstName ?? PROFILE_PLACEHOLDER.firstName ?? '',
  lastName: source?.lastName ?? PROFILE_PLACEHOLDER.lastName ?? '',
  name: source?.name ?? getDisplayName(source ?? PROFILE_PLACEHOLDER),
  city: source?.city ?? PROFILE_PLACEHOLDER.city ?? '',
  goal: source?.goal ?? PROFILE_PLACEHOLDER.goal ?? '',
  experienceLevel: source?.experienceLevel ?? PROFILE_PLACEHOLDER.experienceLevel ?? '',
  weightKg:
    source?.weightKg !== undefined
      ? String(source.weightKg)
      : PROFILE_PLACEHOLDER.weightKg !== undefined
        ? String(PROFILE_PLACEHOLDER.weightKg)
        : '',
  heightCm:
    source?.heightCm !== undefined
      ? String(source.heightCm)
      : PROFILE_PLACEHOLDER.heightCm !== undefined
        ? String(PROFILE_PLACEHOLDER.heightCm)
        : '',
  workoutsPerWeekTarget:
    source?.workoutsPerWeekTarget !== undefined
      ? String(source.workoutsPerWeekTarget)
      : PROFILE_PLACEHOLDER.workoutsPerWeekTarget !== undefined
        ? String(PROFILE_PLACEHOLDER.workoutsPerWeekTarget)
        : '',
  bio: source?.bio ?? PROFILE_PLACEHOLDER.bio ?? '',
  birthDate: (source?.birthDate ?? '').slice(0, 10),
});

const formatStatValue = (
  value: number | undefined,
  unit: string,
  fallback: string,
) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}${unit}`;
  }
  return fallback;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Nie udało się odczytać pliku.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Nie udało się odczytać pliku.'));
    reader.readAsDataURL(file);
  });

const ProfileDrawer = ({
  isOpen,
  onClose,
  user,
  isAuthenticated,
  onProfileSave,
  onAvatarUpload,
  onThemeSelect,
  onEmailChange,
  onPasswordChange,
}: ProfileDrawerProps) => {
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => toProfileForm(user));
  const [profileStatus, setProfileStatus] = useState<StatusMessage | null>(null);
  const [emailStatus, setEmailStatus] = useState<StatusMessage | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<StatusMessage | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<StatusMessage | null>(null);
  const [themeStatus, setThemeStatus] = useState<StatusMessage | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', currentPassword: '' });
  const [isThemeMenuOpen, setThemeMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isThemeMenuOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (!themeMenuRef.current) return;
      if (!themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isThemeMenuOpen]);

  const previewTheme = (theme: string) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: theme }));
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('Nie udało się zapisać motywu w localStorage', error);
    }
  };

  useEffect(() => {
    setProfileForm(toProfileForm(user));
  }, [user]);

  const displayProfile = useMemo<AuthenticatedUser>(() => {
    if (user) return user;
    return PROFILE_PLACEHOLDER;
  }, [user]);

  const experienceLabel = useMemo(
    () => getExperienceLabel(displayProfile.experienceLevel),
    [displayProfile.experienceLevel],
  );

  const readThemeFromEnvironment = useCallback(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme');
      if (attr) {
        return attr;
      }
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theme');
        if (stored) {
          return stored;
        }
      } catch (error) {
        console.warn('Nie udało się odczytać motywu z localStorage', error);
      }
    }
    return displayProfile.themePreference ?? null;
  }, [displayProfile.themePreference]);

  useEffect(() => {
    setCurrentTheme(readThemeFromEnvironment());
  }, [readThemeFromEnvironment, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setCurrentTheme(detail);
      }
    };
    window.addEventListener('wt:theme-changed', handler as EventListener);
    return () => window.removeEventListener('wt:theme-changed', handler as EventListener);
  }, []);

  const bmi = useMemo(() => {
    if (!displayProfile.weightKg || !displayProfile.heightCm) return null;
    const meters = displayProfile.heightCm / 100;
    if (!meters) return null;
    const result = displayProfile.weightKg / (meters * meters);
    return Number.isFinite(result) ? result : null;
  }, [displayProfile.heightCm, displayProfile.weightKg]);

  const stats = useMemo(
    () => [
      {
        label: 'Waga',
        value: formatStatValue(displayProfile.weightKg, ' kg', 'Brak danych'),
        icon: '⚖️',
      },
      {
        label: 'Wzrost',
        value: formatStatValue(displayProfile.heightCm, ' cm', 'Brak danych'),
        icon: '📏',
      },
      {
        label: 'Cel tygodniowy',
        value:
          displayProfile.workoutsPerWeekTarget !== undefined
            ? `${displayProfile.workoutsPerWeekTarget} sesje`
            : 'Brak danych',
        icon: '📅',
      },
      {
        label: 'BMI',
        value: bmi ? bmi.toFixed(1) : '—',
        icon: '📊',
      },
    ],
    [displayProfile.heightCm, displayProfile.weightKg, displayProfile.workoutsPerWeekTarget, bmi],
  );

  const activeTheme = currentTheme ?? displayProfile.themePreference ?? 'light';
  const isDarkTheme = DARK_THEMES.has(activeTheme);
  const isNordTheme = activeTheme === 'nord';
  const cardSurfaceClass = isDarkTheme
    ? 'bg-white/5 border border-white/15 text-white shadow-[0_35px_80px_rgba(0,0,0,0.7)]'
    : isNordTheme
      ? 'bg-gradient-to-b from-[#F6FAFF] to-[#E5EEFF] border border-[#C6D8FF]/70 text-[#0F172A] shadow-[0_30px_70px_rgba(15,23,42,0.12)]'
      : 'bg-base-100/90 border border-base-200/60 text-base-content shadow-lg';
  const statSurfaceClass = isDarkTheme
    ? 'bg-white/10 border border-white/10 text-white'
    : isNordTheme
      ? 'bg-white/80 border border-[#D6E4FF]/70 text-[#0F172A]'
      : 'bg-base-200/60 border border-base-200/80 text-base-content';
  const mutedTextClass = isDarkTheme
    ? 'text-white/70'
    : isNordTheme
      ? 'text-[#1E3A8A]/70'
      : 'text-base-content/70';
  const accentTextClass = isDarkTheme
    ? 'text-white/60'
    : isNordTheme
      ? 'text-[#1E3A8A]/60'
      : 'text-base-content/60';
  const dividerToneClass = isDarkTheme ? 'opacity-30' : isNordTheme ? 'opacity-70' : '';
  const inputSurfaceClass = isDarkTheme
    ? 'input input-bordered bg-white/5 border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:border-primary/70'
    : isNordTheme
      ? 'input input-bordered bg-white/85 border-[#C6D8FF]/80 text-[#0F172A] placeholder:text-[#1E3A8A]/50 focus:outline-none focus:border-[#7DA2FF]'
      : 'input input-bordered bg-base-200/40 focus:outline-none focus:border-primary/60';
  const textareaSurfaceClass = isDarkTheme
    ? 'textarea textarea-bordered bg-white/5 border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:border-primary/70'
    : isNordTheme
      ? 'textarea textarea-bordered bg-white/85 border-[#C6D8FF]/80 text-[#0F172A] placeholder:text-[#1E3A8A]/50 focus:outline-none focus:border-[#7DA2FF]'
      : 'textarea textarea-bordered bg-base-200/40 focus:outline-none focus:border-primary/60';
  const buildActionButtonClass = (disabled: boolean) =>
    `btn btn-primary w-full shadow-lg shadow-primary/30 ${disabled ? 'btn-disabled' : ''}`;

  const canEdit = isAuthenticated && Boolean(user);

  const renderStatus = (status: StatusMessage | null) => {
    if (!status) return null;
    const color = status.type === 'success' ? 'text-success' : 'text-error';
    return <p className={`text-xs mt-2 ${color}`}>{status.text}</p>;
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus(null);
    if (!canEdit) return;
    setProfileSaving(true);
    try {
      const payload: ProfileEditableFields = {
        firstName: profileForm.firstName || undefined,
        lastName: profileForm.lastName || undefined,
        name: profileForm.name || undefined,
        city: profileForm.city || undefined,
        goal: profileForm.goal || undefined,
        experienceLevel: profileForm.experienceLevel || undefined,
        bio: profileForm.bio || undefined,
        birthDate: profileForm.birthDate || undefined,
      };

      if (profileForm.weightKg) payload.weightKg = Number(profileForm.weightKg);
      if (profileForm.heightCm) payload.heightCm = Number(profileForm.heightCm);
      if (profileForm.workoutsPerWeekTarget)
        payload.workoutsPerWeekTarget = Number(profileForm.workoutsPerWeekTarget);

      await onProfileSave(payload);
      setProfileStatus({ type: 'success', text: 'Profil został zaktualizowany.' });
    } catch (error) {
      console.error('Nie udało się zaktualizować profilu', error);
      setProfileStatus({ type: 'error', text: 'Nie udało się zapisać profilu.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!canEdit) {
      setAvatarStatus({ type: 'error', text: 'Musisz być zalogowany, aby zmienić avatar.' });
      return;
    }
    setAvatarStatus(null);
    const file = event.target.files[0];
    event.target.value = '';
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarStatus({ type: 'error', text: 'Plik jest zbyt duży (max 2 MB).' });
      return;
    }
    try {
      setAvatarSaving(true);
      const dataUrl = await fileToDataUrl(file);
      await onAvatarUpload(dataUrl);
      setAvatarStatus({ type: 'success', text: 'Avatar został zaktualizowany.' });
    } catch (error) {
      console.error('Nie udało się zapisać avatara', error);
      setAvatarStatus({ type: 'error', text: 'Nie udało się zapisać avatara.' });
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleThemeClick = async (theme: string) => {
    setThemeStatus(null);
    if (!canEdit) {
      setThemeStatus({ type: 'error', text: 'Zaloguj się, aby zmieniać motyw.' });
      return;
    }
    try {
      setThemeSaving(true);
      previewTheme(theme);
      setCurrentTheme(theme);
      await onThemeSelect(theme);
      setThemeStatus({ type: 'success', text: `Motyw "${theme}" został zapisany.` });
      setThemeMenuOpen(false);
    } catch (error) {
      console.error('Nie udało się zmienić motywu', error);
      setThemeStatus({ type: 'error', text: 'Nie udało się zmienić motywu.' });
    } finally {
      setThemeSaving(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setEmailStatus(null);
    setEmailSaving(true);
    try {
      await onEmailChange({
        newEmail: emailForm.newEmail,
        currentPassword: emailForm.currentPassword,
      });
      setEmailStatus({ type: 'success', text: 'Adres e-mail został zmieniony.' });
      setEmailForm({ newEmail: '', currentPassword: '' });
    } catch (error) {
      console.error('Nie udało się zmienić adresu e-mail', error);
      setEmailStatus({ type: 'error', text: 'Zmiana e-maila nie powiodła się.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setPasswordStatus(null);
    setPasswordSaving(true);
    try {
      await onPasswordChange({
        newPassword: passwordForm.newPassword,
        currentPassword: passwordForm.currentPassword,
      });
      setPasswordStatus({ type: 'success', text: 'Hasło zostało zaktualizowane.' });
      setPasswordForm({ newPassword: '', currentPassword: '' });
    } catch (error) {
      console.error('Nie udało się zmienić hasła', error);
      setPasswordStatus({ type: 'error', text: 'Zmiana hasła nie powiodła się.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[1200] transition-all duration-300 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-transparent transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      ></div>
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[460px] backdrop-blur-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isDarkTheme
            ? 'bg-[#050607]/95 border-l border-white/15 shadow-[0_35px_80px_rgba(0,0,0,0.8)] text-white'
            : isNordTheme
              ? 'bg-[#F7FAFF]/95 border-l border-[#C6D8FF]/70 text-[#0F172A] shadow-[0_35px_80px_rgba(15,23,42,0.18)]'
              : 'bg-base-100/95 border-l border-base-200/60 shadow-[0_25px_80px_rgba(0,0,0,0.55)] text-base-content'
        }`}
        role="dialog"
        aria-label="Panel profilu"
      >
        <div className="h-full overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-base-300/60">
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border p-5 shadow-sm backdrop-blur ${
              isDarkTheme
                ? 'border-white/15 bg-white/5 text-white'
                : isNordTheme
                  ? 'border-[#C6D8FF]/70 bg-gradient-to-r from-[#ECF3FF] via-[#F7FAFF] to-[#E6F0FF] text-[#0F172A]'
                  : 'border-base-200/50 bg-gradient-to-r from-primary/5 via-base-100/60 to-base-100/90 text-base-content'
            }`}
          >
            <div>
              <p className={`text-[11px] uppercase tracking-[0.2em] ${accentTextClass}`}>Twój panel</p>
              <h2 className="text-2xl font-semibold">Profil użytkownika</h2>
              <p className={`text-sm ${mutedTextClass}`}>
                Zaktualizuj dane, motyw i bezpieczeństwo konta w jednym miejscu.
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className={`card rounded-2xl backdrop-blur ${cardSurfaceClass}`}>
            <div className="card-body space-y-4">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="w-20 rounded-full ring ring-offset-base-100 ring-offset-2 ring-secondary">
                    {displayProfile.avatarUrl ? (
                      <img src={displayProfile.avatarUrl} alt="Avatar użytkownika" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center text-3xl">
                        {getDisplayName(displayProfile).charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className={`text-sm uppercase ${accentTextClass}`}>Twój profil</p>
                  <h3 className="text-xl font-bold">
                    {getDisplayName(displayProfile)}
                  </h3>
                  <p className={`text-sm flex items-center gap-1 ${mutedTextClass}`}>
                    <span role="img" aria-hidden="true">
                      📍
                    </span>
                    {displayProfile.city?.trim() ? displayProfile.city : 'Dodaj lokalizację'}
                  </p>
                  <p className={`text-xs ${mutedTextClass}`}>
                    {experienceLabel ?? 'Dodaj poziom doświadczenia'}
                  </p>
                </div>
              </div>
              <div className={`divider my-4 ${dividerToneClass}`}></div>
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className={`p-3 rounded-xl ${statSurfaceClass}`}>
                    <p className={`text-xs ${accentTextClass}`}>{stat.label}</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      <span>{stat.icon}</span>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`card rounded-2xl backdrop-blur ${cardSurfaceClass}`}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="card-title text-base">Zarządzaj avatarem</h3>
                  <p className={`text-sm ${mutedTextClass}`}>
                    Dodaj swoje zdjęcie lub pozostaw aktualny obraz.
                  </p>
                </div>
                <label className={`btn btn-sm btn-outline ${!canEdit ? 'btn-disabled' : ''}`}>
                  {avatarSaving ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Zapisuję
                    </>
                  ) : (
                    'Zmień'
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={!canEdit}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              {renderStatus(avatarStatus)}
            </div>
          </div>

          <div className={`card relative rounded-2xl backdrop-blur overflow-visible z-20 ${cardSurfaceClass}`}>
            <div className="card-body relative" ref={themeMenuRef}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="card-title text-base">Motyw aplikacji</h3>
                  <p className={`text-sm ${mutedTextClass}`}>
                    Wybierz kolorystykę panelu spośród wszystkich dostępnych motywów.
                  </p>
                </div>
                {themeSaving && <span className="loading loading-spinner loading-xs"></span>}
              </div>
              <div className="relative z-20">
                <button
                  type="button"
                  className={`btn btn-outline w-full justify-between ${!canEdit ? 'btn-disabled opacity-60' : ''}`}
                  onClick={() => canEdit && setThemeMenuOpen((prev) => !prev)}
                  disabled={!canEdit}
                >
                  <span className="capitalize">
                    {currentTheme ?? 'Wybierz motyw'}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl transition-all duration-200 z-[120] ${
                    isThemeMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
                  } ${
                    isDarkTheme
                      ? 'bg-[#0a0b0d]/95 border-white/15'
                      : isNordTheme
                        ? 'bg-[#F7FAFF]/95 border-[#C6D8FF]/70'
                        : 'bg-base-100/95 border-base-200/70'
                  }`}
                >
                  <div className="max-h-36 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-base-300/70">
                    {THEMES.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        className={`capitalize text-sm px-3 py-2 rounded-lg border text-left transition-colors ${
                          currentTheme === theme
                            ? 'border-primary bg-primary/10 text-primary'
                            : isDarkTheme
                              ? 'border-white/15 text-white/80 hover:border-primary/60'
                              : isNordTheme
                                ? 'border-[#C6D8FF]/70 text-[#0F172A] hover:border-primary/60'
                                : 'border-base-200 text-base-content hover:border-primary/60'
                        }`}
                        onClick={() => handleThemeClick(theme)}
                        disabled={!canEdit}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {renderStatus(themeStatus)}
            </div>
          </div>

          <div className={`card rounded-2xl backdrop-blur ${cardSurfaceClass}`}>
            <div className="card-body">
              <h3 className="card-title text-base">Dane osobiste</h3>
              {!canEdit && (
                <div className="alert alert-info text-sm">
                  <span>Zaloguj się, aby edytować i zapisywać swoje dane.</span>
                </div>
              )}
              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Imię</span>
                    </label>
                    <input
                      type="text"
                      className={inputSurfaceClass}
                      value={profileForm.firstName}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nazwisko</span>
                    </label>
                    <input
                      type="text"
                      className={inputSurfaceClass}
                      value={profileForm.lastName}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Wyświetlana nazwa</span>
                  </label>
                  <input
                    type="text"
                    className={inputSurfaceClass}
                    value={profileForm.name}
                    disabled={!canEdit || profileSaving}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Miasto</span>
                    </label>
                    <input
                      type="text"
                      className={inputSurfaceClass}
                      value={profileForm.city}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, city: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Data urodzenia</span>
                    </label>
                    <input
                      type="date"
                      className={inputSurfaceClass}
                      value={profileForm.birthDate}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, birthDate: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Cel treningowy</span>
                  </label>
                  <textarea
                    className={textareaSurfaceClass}
                    rows={3}
                    value={profileForm.goal}
                    disabled={!canEdit || profileSaving}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, goal: event.target.value }))
                    }
                  ></textarea>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Doświadczenie</span>
                  </label>
                  <div className={`${inputSurfaceClass} flex items-center min-h-[3rem] select-none pointer-events-none`}>
                    {experienceLabel ?? (
                      <span className={mutedTextClass}>Uzupełnij ankietę startową, aby określić poziom.</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Waga (kg)</span>
                    </label>
                    <input
                      type="number"
                      className={inputSurfaceClass}
                      value={profileForm.weightKg}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, weightKg: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Wzrost (cm)</span>
                    </label>
                    <input
                      type="number"
                      className={inputSurfaceClass}
                      value={profileForm.heightCm}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, heightCm: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Sesje tygodniowo</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      className={inputSurfaceClass}
                      value={profileForm.workoutsPerWeekTarget}
                      disabled={!canEdit || profileSaving}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, workoutsPerWeekTarget: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Krótki opis</span>
                  </label>
                  <textarea
                    className={textareaSurfaceClass}
                    rows={4}
                    value={profileForm.bio}
                    disabled={!canEdit || profileSaving}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
                    }
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className={buildActionButtonClass(!canEdit || profileSaving)}
                  disabled={!canEdit || profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Zapisuję profil
                    </>
                  ) : (
                    'Zapisz profil'
                  )}
                </button>
                {renderStatus(profileStatus)}
              </form>
            </div>
          </div>

          <div className={`card rounded-2xl backdrop-blur ${cardSurfaceClass}`}>
            <div className="card-body space-y-6">
              <div>
                <h3 className="card-title text-base">Zmień adres e-mail</h3>
                <form className="space-y-3" onSubmit={handleEmailSubmit}>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nowy adres e-mail</span>
                    </label>
                    <input
                      type="email"
                      className={inputSurfaceClass}
                      value={emailForm.newEmail}
                      disabled={!canEdit || emailSaving}
                      onChange={(event) =>
                        setEmailForm((prev) => ({ ...prev, newEmail: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Obecne hasło</span>
                    </label>
                    <input
                      type="password"
                      className={inputSurfaceClass}
                      value={emailForm.currentPassword}
                      disabled={!canEdit || emailSaving}
                      onChange={(event) =>
                        setEmailForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className={buildActionButtonClass(!canEdit || emailSaving)}
                    disabled={!canEdit || emailSaving}
                  >
                    {emailSaving ? 'Zapisuję...' : 'Zmień e-mail'}
                  </button>
                  {renderStatus(emailStatus)}
                </form>
              </div>

              <div className={`divider ${dividerToneClass}`}></div>

              <div>
                <h3 className="card-title text-base">Aktualizacja hasła</h3>
                <form className="space-y-3" onSubmit={handlePasswordSubmit}>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Obecne hasło</span>
                    </label>
                    <input
                      type="password"
                      className={inputSurfaceClass}
                      value={passwordForm.currentPassword}
                      disabled={!canEdit || passwordSaving}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nowe hasło</span>
                    </label>
                    <input
                      type="password"
                      className={inputSurfaceClass}
                      value={passwordForm.newPassword}
                      disabled={!canEdit || passwordSaving}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className={buildActionButtonClass(!canEdit || passwordSaving)}
                    disabled={!canEdit || passwordSaving}
                  >
                    {passwordSaving ? 'Aktualizuję...' : 'Zmień hasło'}
                  </button>
                  {renderStatus(passwordStatus)}
                </form>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ProfileDrawer;
