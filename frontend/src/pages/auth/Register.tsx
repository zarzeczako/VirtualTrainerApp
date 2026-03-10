import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import ThemeController from '../../components/ThemeController';
import type { ProfileEditableFields } from '../home/models/user.model';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
} from '../../services/onboarding-storage';
import logo from '../../images/logo.png';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<ProfileEditableFields | null>(() =>
    loadOnboardingDraft(),
  );
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const syncOnboardingProfile = useCallback(async () => {
    if (!pendingProfile) return;
    try {
      await authService.updateProfile(pendingProfile);
    } catch (syncError) {
      console.error('Nie udało się zapisać danych ankiety', syncError);
    } finally {
      clearOnboardingDraft();
      setPendingProfile(null);
    }
  }, [pendingProfile]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError('');
      
      const registerData = {
        email: data.email,
        password: data.password,
      };
      
      await authService.register(registerData);
      
      // Auto login after registration
      const loginResponse = await authService.login({
        email: data.email,
        password: data.password,
      });
      
      sessionStorage.setItem('token', loginResponse.access_token);
      await syncOnboardingProfile();
      navigate('/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || 
        'Błąd rejestracji. Spróbuj ponownie.'
      );
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
              <div className="flex justify-center mb-4">
                <img src={logo} alt="Wirtualny Trener Logo" className="h-20 w-auto" />
              </div>
            </div>

            {pendingProfile && (
              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Po rejestracji zapiszemy Twoje odpowiedzi z ankiety bezpośrednio w profilu.</span>
              </div>
            )}

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
                autoComplete="new-password"
                {...register('password', {
                  required: 'Hasło jest wymagane',
                  minLength: {
                    value: 6,
                    message: 'Hasło musi mieć co najmniej 6 znaków',
                  },
                  maxLength: {
                    value: 128,
                    message: 'Hasło nie może być dłuższe niż 128 znaków',
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

            <div className="form-control">
              <label className="label" htmlFor="confirmPassword">
                <span className="label-text">Potwierdź hasło</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Potwierdzenie hasła jest wymagane',
                  validate: (value) =>
                    value === password || 'Hasła muszą być identyczne',
                })}
                className="input input-bordered w-full"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.confirmPassword.message}
                  </span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-base-content/70">
              Masz już konto?{' '}
              <Link
                to="/login"
                className="link link-primary font-medium"
              >
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
