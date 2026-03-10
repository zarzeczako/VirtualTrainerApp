import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth.service';
import { THEMES } from './theme-options';

const ThemeController = () => {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    // Pobierz zapisany motyw z localStorage lub użyj domyślnego
    return localStorage.getItem('theme') || 'light';
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const lastPersistedThemeRef = useRef<string | null>(null);

  const persistThemePreference = useCallback(async (theme: string) => {
    if (!authService.isAuthenticated()) {
      return;
    }
    if (lastPersistedThemeRef.current === theme) {
      return;
    }
    try {
      await authService.updateProfile({ themePreference: theme });
      lastPersistedThemeRef.current = theme;
    } catch (error) {
      lastPersistedThemeRef.current = null;
      console.warn('Nie udało się zapisać motywu na profilu użytkownika', error);
    }
  }, []);

  useEffect(() => {
    // Zastosuj motyw do elementu html
    document.documentElement.setAttribute('data-theme', currentTheme);
    // Zapisz w localStorage
    localStorage.setItem('theme', currentTheme);
    window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: currentTheme }));
  }, [currentTheme]);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setCurrentTheme((prev) => (prev === detail ? prev : detail));
      }
    };

    window.addEventListener('wt:theme-changed', syncTheme as EventListener);
    return () => window.removeEventListener('wt:theme-changed', syncTheme as EventListener);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    setIsOpen(false);
    void persistThemePreference(theme);
  };

  // Sformatuj nazwę motywu dla wyświetlenia
  const formatThemeName = (theme: string) => {
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="btn btn-ghost gap-1 normal-case"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
      >
        <svg
          width="20"
          height="20"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block h-5 w-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          ></path>
        </svg>
        <span className="hidden sm:inline">{formatThemeName(currentTheme)}</span>
        <svg
          width="12px"
          height="12px"
          className="ml-1 hidden h-3 w-3 fill-current opacity-60 sm:inline-block"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 2048 2048"
        >
          <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
        </svg>
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-[9999] mt-2 max-h-96 w-[200px] overflow-y-auto overflow-x-hidden rounded-box bg-base-300 p-2 pr-3 shadow-2xl"
          role="listbox"
        >
          <ul className="flex flex-col gap-1" role="presentation">
            {THEMES.map((theme) => (
              <li key={theme}>
                <button
                  type="button"
                  className={`btn btn-ghost justify-start w-full text-left ${
                    currentTheme === theme ? 'active' : ''
                  }`}
                  onClick={() => handleThemeChange(theme)}
                >
                  {formatThemeName(theme)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ThemeController;
