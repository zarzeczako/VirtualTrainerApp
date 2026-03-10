import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const onboardingCompleted = searchParams.get('onboarding');

  useEffect(() => {
    const handleCallback = async () => {
      if (token) {
        // Save token
        sessionStorage.setItem('token', token);
        
        // Check if onboarding is completed
        if (onboardingCompleted === 'false') {
          // User needs to complete onboarding survey
          navigate('/onboarding-survey', { replace: true });
        } else {
          // Check user role and redirect accordingly
          try {
            const profile = await authService.getProfile();
            if (profile.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch (error) {
            console.error('Błąd pobierania profilu:', error);
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        // If no token, redirect to login with error
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [token, onboardingCompleted, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-base-200">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Logowanie...</p>
      </div>
    </div>
  );
}
