import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '../../services/auth.service';
import ThemeController from '../../components/ThemeController';
import logo from '../../images/logo.png';

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');
      const response = await authService.login(data);
      sessionStorage.setItem('token', response.access_token);

      const currentTheme =
        document.documentElement.getAttribute('data-theme') ||
        localStorage.getItem('theme');

      if (currentTheme) {
        try {
          await authService.updateProfile({ themePreference: currentTheme });
        } catch (themeSyncError) {
          console.error('Nie udało się zapisać motywu użytkownika', themeSyncError);
        }
      }

      // Sprawdź rolę użytkownika i przekieruj odpowiednio
      try {
        const profile: UserProfile = await authService.getProfile();
        if (profile.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (profileError) {
        console.error('Nie udało się pobrać profilu użytkownika', profileError);
        navigate('/dashboard');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Błędne logowanie. Spróbuj ponownie');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-base-200 px-4">
      <div className="absolute top-4 right-4">
        <ThemeController />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="card bg-base-100 shadow-2xl">
          <div className="card-body">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img src={logo} alt="Wirtualny Trener Logo" className="h-32 w-auto" />
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text">Email</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email jest wymagany',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Nieprawidłowy adres email',
                  },
                })}
                className="input input-bordered w-full"
                placeholder="twoj@email.com"
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.email.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">Hasło</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Hasło jest wymagane',
                  minLength: {
                    value: 6,
                    message: 'Hasło musi mieć co najmniej 6 znaków',
                  },
                })}
                className="input input-bordered w-full"
                placeholder="••••••••"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.password.message}
                  </span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          {/* OAuth Google */}
          <div className="divider">LUB</div>
          
          <button
            type="button"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`}
            className="btn btn-outline w-full gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#34A853" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#FBBC05" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Zaloguj się przez Google
          </button>

          <button
            type="button"
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/facebook`}
            className="btn btn-outline w-full gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#1877F2"
                d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.495v-9.294H9.847V11.01h2.973V8.414c0-2.946 1.797-4.553 4.422-4.553 1.258 0 2.337.093 2.652.135v3.074l-1.821.001c-1.428 0-1.704.679-1.704 1.674v2.195h3.406l-.444 3.696h-2.962V24h5.805C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.675 0z"
              />
            </svg>
            Zaloguj się przez Facebook
          </button>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-base-content/70">
              <Link to="/forgot-password" className="link link-primary">
                Zapomniałeś hasła?
              </Link>
            </p>
            <p className="text-sm text-base-content/70">
              Nie masz konta?{' '}
              <Link
                to="/onboarding"
                className="link link-primary font-medium"
              >
                Zarejestruj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
