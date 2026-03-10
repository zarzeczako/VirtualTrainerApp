import { Link } from 'react-router-dom'
import ThemeController from './ThemeController'
import logo from '../images/logo.png'

type PublicNavbarProps = {
  isAuthenticated: boolean
}

const linkClasses =
  'px-3 py-2 rounded-md text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 transition-colors'

export default function PublicNavbar({ isAuthenticated }: PublicNavbarProps) {
  return (
    <nav className="bg-base-100/90 backdrop-blur-md shadow-lg relative z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center">
                <img src={logo} alt="Wirtualny Trener Logo" className="h-14 w-auto" />
              </div>
            ) : (
              <Link to="/" className="flex items-center">
                <img src={logo} alt="Wirtualny Trener Logo" className="h-14 w-auto" />
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
            <Link to={{ pathname: '/atlas', search: '?view=public' }} className={linkClasses}>
              Atlas Ćwiczeń
            </Link>
            <Link to={{ pathname: '/chat-ai', search: '?view=public' }} className={linkClasses}>
              CzatAI
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeController />
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Zaloguj się
                </Link>
                <Link to="/onboarding" className="btn btn-primary btn-sm">
                  Rozpocznij teraz
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
