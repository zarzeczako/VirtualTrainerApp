import { Link, NavLink } from 'react-router-dom'
import ThemeController from './ThemeController'
import type { AuthenticatedUser } from '../pages/home/models/user.model'
import { getDisplayName } from '../pages/home/models/user.model'
import logo from '../images/logo.png'

type AppHeaderProps = {
  isAuthenticated: boolean
  user: AuthenticatedUser | null
  onLogout: () => void
  onAvatarClick?: () => void
}

const linkClasses = (isActive: boolean) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-base-300 text-base-content'
      : 'bg-base-200 text-base-content/70 hover:bg-base-300'
  }`

export default function AppHeader({ isAuthenticated, user, onLogout, onAvatarClick }: AppHeaderProps) {
  return (
    <nav className="bg-base-100 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <img src={logo} alt="Wirtualny Trener Logo" className="h-14 w-auto" />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
            <NavLink to="/dashboard" className={({ isActive }) => linkClasses(isActive)}>
              Plan ćwiczeń
            </NavLink>
            <NavLink to="/atlas" className={({ isActive }) => linkClasses(isActive)}>
              Atlas ćwiczeń
            </NavLink>
            <NavLink to="/progress" className={({ isActive }) => linkClasses(isActive)}>
              Postęp
            </NavLink>
            <NavLink to="/chat-ai" className={({ isActive }) => linkClasses(isActive)}>
              CzatAI
            </NavLink>
            <NavLink to="/gyms" className={({ isActive }) => linkClasses(isActive)}>
              Znajdź siłownie
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink 
                to="/admin" 
                className={({ isActive }) => `${linkClasses(isActive)}`}
              >
                Panel Admina
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeController />
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => onAvatarClick?.()}
                className="flex items-center gap-2 rounded-full bg-base-200/80 px-2 py-1 text-left hover:bg-base-300"
              >
                <span className="avatar">
                  <span className="w-10 rounded-full border border-base-300 bg-base-100 text-base-content flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar użytkownika" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-semibold">
                        {getDisplayName(user).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-sm text-base-content font-medium max-w-[8rem] truncate">
                  {getDisplayName(user)}
                </span>
              </button>
            ) : null}
            {isAuthenticated ? (
              <button onClick={onLogout} className="btn btn-error btn-sm">
                Wyloguj się
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Zaloguj się
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Rozpocznij teraz
                  <span className="ml-2">→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
