import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../../components/AppHeader'
import { authService } from '../../../services/auth.service'
import type { AuthenticatedUser, ProfileEditableFields } from '../models/user.model'
import ProfileSidebar from '../components/ProfileSidebar'
import { workoutPlansService } from '../services/workoutPlans.api'
import type { WorkoutPlan } from '../models/workout-plan.model'
import WorkoutPlanCard from '../components/WorkoutPlanCard'

export default function PlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/')
  }

  const handleProfileSave = async (changes: ProfileEditableFields) => {
    try {
      const updated = await authService.updateProfile(changes)
      setUser(updated)
      if (updated.themePreference) {
        document.documentElement.setAttribute('data-theme', updated.themePreference)
        localStorage.setItem('theme', updated.themePreference)
        window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: updated.themePreference }))
      }
    } catch (err) {
      console.error('Failed to save profile', err)
      throw err
    }
  }

  const handleAvatarUpload = async (avatarDataUrl: string) => {
    await handleProfileSave({ avatarDataUrl })
  }

  const handleThemeSelect = async (theme: string) => {
    await handleProfileSave({ themePreference: theme })
  }

  const handleEmailChange = async (payload: { newEmail: string; currentPassword: string }) => {
    const updated = await authService.updateEmail(payload)
    setUser(updated)
  }

  const handlePasswordChange = async (payload: { newPassword: string; currentPassword: string }) => {
    await authService.updatePassword(payload)
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const all = await workoutPlansService.getAllPlans()
        if (!active) return
        setPlans(all)
      } catch (err) {
        console.error(err)
        setError('Nie udało się pobrać planów')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!isAuthenticated) {
      setUser(null)
      return () => { active = false }
    }

    authService.getProfile()
      .then((profile: AuthenticatedUser) => {
        if (!active) return
        setUser(profile)
      })
      .catch((err) => {
        if (!active) return
        console.error('Nie udało się pobrać profilu użytkownika:', err)
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
      })

    return () => { active = false }
  }, [isAuthenticated])

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten plan?')) return
    try {
      await workoutPlansService.deletePlan(planId)
      const refreshed = await workoutPlansService.getAllPlans()
      setPlans(refreshed)
    } catch (err) {
      console.error(err)
      setError('Usuwanie planu nie powiodło się')
    }
  }

  const handleView = (planId: string) => {
    navigate(`/plan/${planId}`)
  }

  const handleSetActive = async (planId: string) => {
    if (activatingId === planId) return
    try {
      setError(null)
      setActivatingId(planId)
      await workoutPlansService.setActivePlan(planId)
      setPlans((prev) => prev.map((plan) => ({
        ...plan,
        isActive: plan._id === planId,
      })))
    } catch (err) {
      console.error(err)
      setError('Nie udało się ustawić aktywnego planu')
    } finally {
      setActivatingId(null)
    }
  }

  const handleToggleDetails = (planId: string) => {
    setExpandedPlanId((prev) => {
      const next = prev === planId ? null : planId
      console.debug('[PlansPage] toggle details:', { clicked: planId, from: prev, to: next })
      return next
    })
  }

  return (
    <div className="min-h-screen bg-base-200">
      <AppHeader
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        onAvatarClick={() => setProfileDrawerOpen(true)}
      />

      <ProfileSidebar
        isOpen={isProfileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        onProfileSave={handleProfileSave}
        onAvatarUpload={handleAvatarUpload}
        onThemeSelect={handleThemeSelect}
        onEmailChange={handleEmailChange}
        onPasswordChange={handlePasswordChange}
      />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Wszystkie plany</h2>
            <p className="text-base-content/70">Przeglądaj, przełączaj i usuwaj swoje plany treningowe.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Powrót</button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        )}

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {!loading && plans.length === 0 && (
          <div className="card bg-base-100 shadow p-8 text-center">
            Brak planów
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div key={plan._id} className={`${activatingId === plan._id ? 'opacity-70' : ''} h-full`}>
              <WorkoutPlanCard
                plan={plan}
                onDelete={handleDelete}
                onView={handleView}
                onSetActive={handleSetActive}
                isExpanded={expandedPlanId === plan._id}
                onToggleDetails={handleToggleDetails}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
