import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { workoutPlansService } from './services/workoutPlans.api'
import type {
  GeneratePlanDto,
  WorkoutPlan,
} from './models/workout-plan.model'
import {
  extractApiErrorMessage,
  isApiError,
} from './utils/apiError'
import DashboardStats from './components/DashboardStats'
import WorkoutPlanCard from './components/WorkoutPlanCard'
import GeneratePlanModal from './components/GeneratePlanModal'
import FirstPlanWizard from './components/FirstPlanWizard'
import AppHeader from '../../components/AppHeader'
import ProfileSidebar from './components/ProfileSidebar'
import type {
  AuthenticatedUser,
  ProfileEditableFields,
} from './models/user.model'
import './components/App.css'

function App() {
  const initialIsAuthenticated = authService.isAuthenticated()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFirstPlanWizardOpen, setIsFirstPlanWizardOpen] = useState(false)
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [loading, setLoading] = useState(initialIsAuthenticated)
  const navigate = useNavigate()

  const applyThemePreference = useCallback((theme?: string) => {
    if (!theme) return
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: theme }))
  }, [])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      if (!isAuthenticated) {
        if (!active) return
        setLoading(false)
        setUser(null)
        setPlans([])
        setError(null)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const [profile, workoutPlans] = await Promise.all([
          authService.getProfile(),
          workoutPlansService.getAllPlans(),
        ])

        if (!active) return

        setUser(profile)
        if (profile?.themePreference) {
          applyThemePreference(profile.themePreference)
        }
        setPlans(workoutPlans)
        
        // Automatycznie otwórz ankietę pierwszego planu jeśli użytkownik nie ma żadnych planów
        if (workoutPlans.length === 0) {
          setIsFirstPlanWizardOpen(true)
        }
      } catch (err) {
        if (!active) return

        if (isApiError(err) && err.response?.status === 401) {
          authService.logout()
          setIsAuthenticated(false)
          setIsModalOpen(false)
          setUser(null)
          setPlans([])
          setError(null)
        } else {
          console.error('Failed to load data:', err)
          const message = extractApiErrorMessage(
            err,
            'Nie udało się załadować danych',
          )
          setError(message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [applyThemePreference, isAuthenticated])

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    setPlans([])
    setError(null)
    setIsModalOpen(false)
    setProfileDrawerOpen(false)
    navigate('/')
  }

  const handleOpenModal = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setIsModalOpen(true)
  }

  const handleGeneratePlan = async (dto: GeneratePlanDto) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      const newPlan = await workoutPlansService.generatePlan(dto)
      setPlans((prev) => [
        { ...newPlan, isActive: true },
        ...prev.map((plan) => ({ ...plan, isActive: false })),
      ])
      setIsModalOpen(false)
      setIsFirstPlanWizardOpen(false)
    } catch (err) {
      console.error('Failed to generate plan:', err)
      const message = extractApiErrorMessage(
        err,
        'Nie udało się wygenerować planu',
      )
      setError(
        `Nie udało się wygenerować planu${message ? `: ${message}` : ''}`
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!window.confirm('Czy na pewno chcesz usunąć ten plan?')) return

    try {
      await workoutPlansService.deletePlan(planId)
      const updated = await workoutPlansService.getAllPlans()
      setPlans(updated)
    } catch (err) {
      console.error('Failed to delete plan:', err)
      const message = extractApiErrorMessage(
        err,
        'Nie udało się usunąć planu',
      )
      setError(message)
    }
  }

  const handleViewPlan = (planId: string) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/plan/${planId}`)
  }

  const ensureAuthenticated = useCallback(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return false
    }
    return true
  }, [navigate])

  const handleProfileSave = useCallback(
    async (changes: ProfileEditableFields) => {
      if (!ensureAuthenticated()) return
      const updated = await authService.updateProfile(changes)
      setUser(updated)
      if (updated.themePreference) {
        applyThemePreference(updated.themePreference)
      }
    },
    [applyThemePreference, ensureAuthenticated],
  )

  const handleAvatarUpload = useCallback(
    async (avatarDataUrl: string) => {
      await handleProfileSave({ avatarDataUrl })
    },
    [handleProfileSave],
  )

  const handleThemeSelect = useCallback(
    async (theme: string) => {
      await handleProfileSave({ themePreference: theme })
    },
    [handleProfileSave],
  )

  const handleEmailChange = useCallback(
    async (payload: { newEmail: string; currentPassword: string }) => {
      if (!ensureAuthenticated()) return
      const updated = await authService.updateEmail(payload)
      setUser(updated)
    },
    [ensureAuthenticated],
  )

  const handlePasswordChange = useCallback(
    async (payload: { newPassword: string; currentPassword: string }) => {
      if (!ensureAuthenticated()) return
      await authService.updatePassword(payload)
    },
    [ensureAuthenticated],
  )

  const activePlan = plans.find((plan) => plan.isActive) ?? plans[0] ?? null

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileDrawerOpen(false)
    }
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base-content mt-4">Ładowanie...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-base-200">
        <AppHeader
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          onAvatarClick={() => setProfileDrawerOpen(true)}
        />

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 sm:p-10 shadow-xl text-base-content">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Plan ćwiczeń</p>
                      <h2 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Ostatnio wygenerowany plan</h2>
                      <p className="text-base leading-relaxed text-base-content/80 max-w-2xl">
                        {isAuthenticated
                          ? 'Zarządzaj swoimi planami i szybko przejdź do "Wszystkie plany" lub wygeneruj nowy.'
                          : 'Poznaj możliwości Wirtualnego Trenera i zaloguj się, aby zarządzać swoimi planami.'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-base-content/80">
                        <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Ostatni plan</span>
                        <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Generator AI</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => navigate('/plans')}
                        className="btn btn-primary"
                        title="Wszystkie plany"
                      >
                        Wszystkie plany
                      </button>

                      <button
                        onClick={handleOpenModal}
                        className="btn btn-primary gap-2"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        {isAuthenticated ? 'Nowy plan' : 'Zaloguj się'}
                      </button>
                    </div>
                  </div>
                </section>

                {!isAuthenticated && (
                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                      <h3 className="font-bold">Zaloguj się, aby zobaczyć swoje plany</h3>
                      <div className="text-xs">Po zalogowaniu błyskawicznie wygenerujesz nowy plan i otrzymasz dostęp do historii ćwiczeń.</div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <DashboardStats plans={plans} />

              <div>
                <h3 className="text-xl font-semibold text-base-content mb-4">
                  Aktywny plan
                </h3>

                {plans.length === 0 ? (
                  <div className="card bg-base-100 shadow-xl p-12 text-center">
                    <div className="text-6xl mb-4">
                      {isAuthenticated ? '📋' : '🔒'}
                    </div>
                    <h4 className="text-xl font-semibold text-base-content mb-2">
                      {isAuthenticated
                        ? 'Brak planów treningowych'
                        : 'Zaloguj się, aby zobaczyć swoje plany'}
                    </h4>
                    <p className="text-base-content/70 mb-6">
                      {isAuthenticated
                        ? 'Rozpocznij swoją przygodę z treningiem, tworząc pierwszy plan!'
                        : 'Twój panel jest gotowy. Wystarczy logowanie, aby odblokować pełne funkcje.'}
                    </p>
                    <button
                      onClick={handleOpenModal}
                      className="btn btn-primary gap-2 mx-auto"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      {isAuthenticated ? 'Stwórz pierwszy plan' : 'Przejdź do logowania'}
                    </button>
                  </div>
                ) : (
                  activePlan && (
                    <WorkoutPlanCard
                      key={activePlan._id}
                      plan={activePlan}
                      onDelete={handleDeletePlan}
                      onView={handleViewPlan}
                      variant="hero"
                      className="w-full"
                    />
                  )
                )}
              </div>
          </div>
        </div>
      </div>

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

      <GeneratePlanModal
        isOpen={isAuthenticated && isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGeneratePlan}
        isGenerating={isGenerating}
      />
      <FirstPlanWizard
        isOpen={isAuthenticated && isFirstPlanWizardOpen}
        onGenerate={handleGeneratePlan}
        isGenerating={isGenerating}
      />    </>
  )
}

export default App
