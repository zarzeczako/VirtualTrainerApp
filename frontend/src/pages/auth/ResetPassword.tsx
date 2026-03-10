import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ThemeController from '../../components/ThemeController';
import logo from '../../images/logo.png';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Brak tokenu resetowania. Link może być nieprawidłowy.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          newPassword: data.newPassword 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nie udało się zresetować hasła');
      }

      // Success - redirect to login
      alert('Hasło zostało zmienione. Możesz się teraz zalogować.');
      navigate('/login');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-base-200 px-4">
        <div className="card bg-base-100 shadow-2xl max-w-md w-full">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-error">Nieprawidłowy link</h2>
            <p>Link do resetowania hasła jest nieprawidłowy lub wygasł.</p>
            <div className="card-actions justify-center mt-4">
              <Link to="/forgot-password" className="btn btn-primary">
                Wyślij nowy link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h2 className="text-2xl font-bold">Ustaw nowe hasło</h2>
              <p className="text-sm text-base-content/70 mt-2">
                Wprowadź nowe hasło do swojego konta
              </p>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="form-control">
                <label className="label" htmlFor="newPassword">
                  <span className="label-text">Nowe hasło</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword', {
                    required: 'Hasło jest wymagane',
                    minLength: {
                      value: 6,
                      message: 'Hasło musi mieć co najmniej 6 znaków',
                    },
                  })}
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                />
                {errors.newPassword && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.newPassword.message}
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
                      value === newPassword || 'Hasła muszą być identyczne',
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
                {isLoading ? 'Resetowanie...' : 'Resetuj hasło'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="link link-primary text-sm">
                Powrót do logowania
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
