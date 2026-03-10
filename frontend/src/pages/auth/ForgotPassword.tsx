import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import ThemeController from '../../components/ThemeController';
import logo from '../../images/logo.png';

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);

      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        throw new Error('Nie udało się wysłać żądania resetowania hasła');
      }

      setSuccess(true);
    } catch (err) {
      setError('Wystąpił błąd. Spróbuj ponownie później.');
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
              <h2 className="text-2xl font-bold">Resetowanie hasła</h2>
              <p className="text-sm text-base-content/70 mt-2">
                Podaj swój adres email, a wyślemy Ci link do resetowania hasła
              </p>
            </div>

            {success && (
              <div className="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Jeśli podany email istnieje, wysłaliśmy link do resetowania hasła.</span>
              </div>
            )}

            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!success && (
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                </button>
              </form>
            )}

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
