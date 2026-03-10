import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../../../components/AppHeader'
import PublicNavbar from '../../../components/PublicNavbar'
import ProfileSidebar from '../components/ProfileSidebar'
import type { ProfileEditableFields } from '../models/user.model'
import { authService } from '../../../services/auth.service'
import { exercisesService } from '../../../services/exercises.service'
import type { AuthenticatedUser } from '../models/user.model'
import type { AtlasExercise } from '../models/exercise-atlas.model'
import { ALL_BODY_PARTS_OPTION } from '../models/exercise-atlas.model'
import { filterExercises, type ExerciseFilterPredicate } from '../utils/exerciseFilters'
import { getBodyPartLabel, getEquipmentLabel } from '../utils/exerciseLabels'

type CustomFilterDefinition = {
  id: string
  label: string
  predicate: ExerciseFilterPredicate
}

const matchesEquipment = (equipment: string | undefined, keywords: string[]): boolean => {
  if (!equipment) {
    return false
  }
  const normalized = equipment.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

const FREE_WEIGHT_KEYWORDS = [
  'barbell',
  'olympic barbell',
  'dumbbell',
  'kettlebell',
  'trap bar',
  'ez barbell',
  'weighted',
]

const GYM_KEYWORDS = [
  ...FREE_WEIGHT_KEYWORDS,
  'cable',
  'machine',
  'ergometer',
  'stationary bike',
  'skierg',
  'stepmill',
  'bosu ball',
  'medicine ball',
  'rope',
  'roller',
  'stability ball',
]

const MASS_TARGETS = new Set([
  'pectorals',
  'lats',
  'glutes',
  'quads',
  'hamstrings',
  'delts',
  'traps',
  'upper back',
  'triceps',
  'biceps',
])

const CUSTOM_FILTERS: CustomFilterDefinition[] = [
  {
    id: 'custom:free-weight',
    label: 'Wolne ciężary',
    predicate: (exercise) => matchesEquipment(exercise.equipment, FREE_WEIGHT_KEYWORDS),
  },
  {
    id: 'custom:gym',
    label: 'Siłownia',
    predicate: (exercise) => matchesEquipment(exercise.equipment, GYM_KEYWORDS),
  },
  {
    id: 'custom:mass',
    label: 'Masa mięśniowa',
    predicate: (exercise) => MASS_TARGETS.has(exercise.target?.toLowerCase() ?? ''),
  },
]

export default function ExerciseAtlasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [exercises, setExercises] = useState<AtlasExercise[]>([])
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_BODY_PARTS_OPTION)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<AtlasExercise | null>(null)
  const [loadingExerciseId, setLoadingExerciseId] = useState<string | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const forcePublicNavbar = new URLSearchParams(location.search).get('view') === 'public'
  const showPublicNavbar = !isAuthenticated || forcePublicNavbar

  const handleLogout = useCallback(() => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/')
  }, [navigate])

  const handleProfileSave = useCallback(async (changes: ProfileEditableFields) => {
    const updated = await authService.updateProfile(changes)
    setUser(updated)
    if (updated.themePreference) {
      document.documentElement.setAttribute('data-theme', updated.themePreference)
      localStorage.setItem('theme', updated.themePreference)
      window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: updated.themePreference }))
    }
  }, [])

  const handleAvatarUpload = useCallback(async (avatarDataUrl: string) => {
    await handleProfileSave({ avatarDataUrl })
  }, [handleProfileSave])

  const handleThemeSelect = useCallback(async (theme: string) => {
    await handleProfileSave({ themePreference: theme })
  }, [handleProfileSave])

  const handleEmailChange = useCallback(async (payload: { newEmail: string; currentPassword: string }) => {
    const updated = await authService.updateEmail(payload)
    setUser(updated)
  }, [])

  const handlePasswordChange = useCallback(async (payload: { newPassword: string; currentPassword: string }) => {
    await authService.updatePassword(payload)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [exercisesData, bodyPartsData] = await Promise.all([
          exercisesService.getAllSwapExercises(),
          exercisesService.getBodyParts(),
        ])
        setExercises(exercisesData)
        setBodyParts(bodyPartsData)
      } catch (err) {
        console.error('Failed to load exercises:', err)
        setError('Nie udało się załadować ćwiczeń. Spróbuj ponownie później.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    let active = true

    if (!isAuthenticated) {
      setUser(null)
      return () => {
        active = false
      }
    }

    authService
      .getProfile()
      .then((profile: AuthenticatedUser) => {
        if (!active) {
          return
        }
        setUser(profile)
      })
      .catch((profileError: unknown) => {
        if (!active) {
          return
        }
        console.error('Nie udało się pobrać profilu użytkownika:', profileError)
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  const bodyPartCounts = useMemo(() => {
    return exercises.reduce((counts, exercise) => {
      counts[exercise.bodyPart] = (counts[exercise.bodyPart] ?? 0) + 1
      return counts
    }, {} as Record<string, number>)
  }, [exercises])

  const customFilterPredicates = useMemo(
    () =>
      CUSTOM_FILTERS.reduce((acc, filter) => {
        acc[filter.id] = filter.predicate
        return acc
      }, {} as Record<string, ExerciseFilterPredicate>),
    [],
  )

  const customFilterCounts = useMemo(() => {
    return CUSTOM_FILTERS.reduce((counts, filter) => {
      counts[filter.id] = exercises.filter(filter.predicate).length
      return counts
    }, {} as Record<string, number>)
  }, [exercises])

  const filteredExercises = useMemo(
    () => filterExercises(exercises, selectedFilter, searchTerm, customFilterPredicates),
    [customFilterPredicates, exercises, searchTerm, selectedFilter],
  )

  const handleViewDetails = async (exercise: AtlasExercise) => {
    try {
      setLoadingExerciseId(exercise._id)
      const fullExercise = await exercisesService.getSwapExerciseById(exercise._id)
      setSelectedExercise(fullExercise)
    } catch (err) {
      console.error('Failed to load exercise details:', err)
      setSelectedExercise(exercise)
    } finally {
      setLoadingExerciseId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base-content mt-4">Ładowanie ćwiczeń...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {showPublicNavbar ? (
        <PublicNavbar isAuthenticated={isAuthenticated} />
      ) : (
        <AppHeader
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          onAvatarClick={() => setProfileDrawerOpen(true)}
        />
      )}

      <div className="bg-transparent py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 sm:p-10 shadow-xl text-base-content">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Atlas ćwiczeń</p>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Atlas Ćwiczeń</h1>
              <p className="max-w-3xl text-base leading-relaxed text-base-content/80">
                Przeglądaj ponad {exercises.length} ćwiczeń z szczegółowymi instrukcjami
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-base-content/80">
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Filtry partii ciała</span>
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Wolne ciężary</span>
                <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">Siłownia</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="alert alert-error mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

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

        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Filtry</h2>

            <div className="form-control mb-4">
              <input
                type="text"
                placeholder="Szukaj ćwiczenia..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFilter(ALL_BODY_PARTS_OPTION)}
                className={`btn btn-sm ${
                  selectedFilter === ALL_BODY_PARTS_OPTION ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Wszystkie ({exercises.length})
              </button>
              {bodyParts.map((bodyPart) => (
                <button
                  key={bodyPart}
                  onClick={() => setSelectedFilter(bodyPart)}
                  className={`btn btn-sm ${selectedFilter === bodyPart ? 'btn-primary' : 'btn-outline'}`}
                >
                  {getBodyPartLabel(bodyPart)} ({bodyPartCounts[bodyPart] ?? 0})
                </button>
              ))}
              {CUSTOM_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`btn btn-sm ${selectedFilter === filter.id ? 'btn-primary' : 'btn-outline'}`}
                >
                  {filter.label} ({customFilterCounts[filter.id] ?? 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-base-content/70">
            Znaleziono: <span className="font-bold text-base-content">{filteredExercises.length}</span> ćwiczeń
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <div key={exercise._id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <h3 className="card-title text-lg">{exercise.name_pl}</h3>
                <p className="text-sm text-base-content/60">{exercise.name}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <div className="badge badge-primary">{getBodyPartLabel(exercise.bodyPart)}</div>
                  <div className="badge badge-secondary">{exercise.target}</div>
                  <div className="badge badge-accent">{getEquipmentLabel(exercise.equipment)}</div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleViewDetails(exercise)}
                    disabled={loadingExerciseId === exercise._id}
                  >
                    {loadingExerciseId === exercise._id ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Ładowanie...
                      </>
                    ) : (
                      'Zobacz szczegóły'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-2xl text-base-content/50">Nie znaleziono ćwiczeń</p>
            <p className="text-base-content/40 mt-2">Spróbuj zmienić filtry lub wyszukiwanie</p>
          </div>
        )}
      </div>

      {selectedExercise && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setSelectedExercise(null)}
            >
              ✕
            </button>

            <h3 className="font-bold text-2xl mb-2">{selectedExercise.name_pl}</h3>
            <p className="text-base-content/60 mb-4">{selectedExercise.name}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              <div className="badge badge-primary badge-lg">{getBodyPartLabel(selectedExercise.bodyPart)}</div>
              <div className="badge badge-secondary badge-lg">{selectedExercise.target}</div>
              <div className="badge badge-accent badge-lg">{getEquipmentLabel(selectedExercise.equipment)}</div>
            </div>

            {selectedExercise.instructions_pl && selectedExercise.instructions_pl.length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-lg mb-3">Instrukcje wykonania:</h4>
                <ol className="list-decimal list-inside space-y-2">
                  {selectedExercise.instructions_pl.map((instruction, index) => (
                    <li key={index} className="text-base-content/80">
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {selectedExercise.instructions &&
              selectedExercise.instructions.length > 0 &&
              !selectedExercise.instructions_pl && (
                <div className="mb-6">
                  <h4 className="font-bold text-lg mb-3">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {selectedExercise.instructions.map((instruction, index) => (
                      <li key={index} className="text-base-content/80">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

            {(!selectedExercise.instructions_pl || selectedExercise.instructions_pl.length === 0) &&
              (!selectedExercise.instructions || selectedExercise.instructions.length === 0) && (
                <div className="mb-6">
                  <div className="alert alert-info">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="stroke-current shrink-0 w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span>Brak dostępnych instrukcji dla tego ćwiczenia.</span>
                  </div>
                </div>
              )}

            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setSelectedExercise(null)}>
                Zamknij
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setSelectedExercise(null)}></div>
        </div>
      )}
    </div>
  )
}
