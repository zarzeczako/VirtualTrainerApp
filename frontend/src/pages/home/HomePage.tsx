import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import PublicNavbar from '../../components/PublicNavbar';
import './styles/HomePage.css';
import gymVideo from '../../gym.mp4';
import logo from '../../images/logo.png';

export default function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <div className="video-background">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="video-bg"
        >
          <source src={gymVideo} type="video/mp4" />
        </video>
        <div className="video-overlay"></div>
      </div>

      {/* Navigation */}
      <PublicNavbar isAuthenticated={isAuthenticated} />

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex justify-center mb-8 animate-fade-in">
            <img src={logo} alt="Wirtualny Trener Logo" className="h-40 w-auto drop-shadow-2xl" />
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 animate-fade-in">
            Twój Osobisty
            <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent pb-2" style={{ lineHeight: '1.2' }}>
              Wirtualny Trener
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-fade-in-delay">
            Spersonalizowane plany treningowe dopasowane do Twoich celów, 
            poziomu zaawansowania i dostępnego sprzętu. Zacznij swoją 
            transformację już dziś!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay-2">
            <button 
              onClick={() => navigate('/onboarding')}
              className="btn btn-primary btn-lg gap-2 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              Rozpocznij za darmo
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-outline btn-lg border-white text-white hover:bg-white hover:text-black"
            >
              Mam już konto
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="card bg-base-100/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
            <div className="card-body items-center text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="card-title text-base-content">Spersonalizowane Plany</h3>
              <p className="text-base-content/80">
                Plany treningowe dostosowane do Twojego poziomu, celów i dostępnego sprzętu
              </p>
            </div>
          </div>

          <div className="card bg-base-100/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
            <div className="card-body items-center text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="card-title text-base-content">Śledzenie Postępów</h3>
              <p className="text-base-content/80">
                Monitoruj swoje osiągnięcia i obserwuj transformację w czasie
              </p>
            </div>
          </div>

          <div className="card bg-base-100/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
            <div className="card-body items-center text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="card-title text-base-content">Asystent AI</h3>
              <p className="text-base-content/80">
                Otrzymuj porady i odpowiedzi na pytania od naszego inteligentnego asystenta
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="card bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm shadow-2xl">
            <div className="card-body">
              <h2 className="text-4xl font-bold text-white mb-4">
                Gotowy na zmianę?
              </h2>
              <p className="text-xl text-white/90 mb-6">
                Dołącz do tysięcy osób, które już zmieniły swoje życie
              </p>
              <button 
                onClick={() => navigate('/onboarding')}
                className="btn btn-primary btn-lg mx-auto"
              >
                Zacznij teraz - To darmowe!
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-20 py-8 bg-base-100/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base-content/60">
            © 2025 Wirtualny Trener. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}
