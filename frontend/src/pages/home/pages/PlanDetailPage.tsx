import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Info, Shuffle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import AppHeader from '../../../components/AppHeader'
import { authService } from '../../../services/auth.service'
import { workoutPlansService } from '../services/workoutPlans.api'
import type { PlanExercise, WorkoutPlan } from '../models/workout-plan.model'
import WorkoutPlanCard from '../components/WorkoutPlanCard'
import type { AuthenticatedUser, ProfileEditableFields } from '../models/user.model'
import ProfileSidebar from '../components/ProfileSidebar'
import { exercisesService, type Exercise as AtlasExercise } from '../../../services/exercises.service'
import { fontBase64 } from '../../../assets/fonts/Roboto-Regular'

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [swapLoadingId, setSwapLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [swapNotice, setSwapNotice] = useState<{ exerciseId: string; message: string } | null>(null)
  const swapNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [infoExercise, setInfoExercise] = useState<PlanExercise | null>(null)
  const [infoDetails, setInfoDetails] = useState<AtlasExercise | null>(null)
  const [infoLoading, setInfoLoading] = useState(false)

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

  const daysPerWeek = useMemo(() => plan?.daysPerWeek ?? plan?.days?.length ?? 0, [plan])
  const totalExercises = useMemo(
    () => plan?.days?.reduce((sum, day) => sum + day.exercises.length, 0) ?? 0,
    [plan],
  )

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    if (swapNoticeTimeoutRef.current) clearTimeout(swapNoticeTimeoutRef.current)
  }, [])

  const translateMuscle = (raw?: string) => {
    if (!raw) return 'Brak danych'
    const map: Record<string, string> = {
      chest: 'Klatka piersiowa',
      back: 'Plecy',
      'upper back': 'Górny grzbiet',
      lats: 'Mięśnie najszersze',
      shoulders: 'Barki',
      delts: 'Barki',
      traps: 'Czworoboczne',
      'upper arms': 'Ramiona',
      biceps: 'Bicepsy',
      triceps: 'Tricepsy',
      forearms: 'Przedramiona',
      'lower arms': 'Przedramiona',
      abs: 'Mięśnie brzucha',
      waist: 'Talia',
      core: 'Mięśnie brzucha',
      glutes: 'Pośladki',
      'upper legs': 'Górne partie nóg',
      quads: 'Czworogłowe uda',
      hamstrings: 'Dwugłowe uda',
      calves: 'Łydki',
      'lower legs': 'Łydki',
      full: 'Całe ciało',
      'full body': 'Całe ciało',
      neck: 'Szyja',
    }
    return map[raw.toLowerCase()] ?? raw
  }

  const translateEquipment = (raw?: string) => {
    if (!raw) return 'Brak danych'
    const map: Record<string, string> = {
      barbell: 'Sztanga',
      dumbbell: 'Hantle',
      'body weight': 'Masa ciała',
      assisted: 'Maszyna wspomagana',
      'assisted (towel)': 'Maszyna wspomagana (ręcznik)',
      'leverage machine': 'Maszyna dźwigniowa',
      cable: 'Wyciąg',
      kettlebell: 'Kettlebell',
      medicine: 'Piłka lekarska',
      'medicine ball': 'Piłka lekarska',
      bands: 'Gumy oporowe',
      rope: 'Lina',
      'resistance band': 'Guma oporowa',
      smith: 'Maszyna Smitha',
      sled: 'Sanki',
    }
    return map[raw.toLowerCase()] ?? raw
  }

  useEffect(() => {
    const loadInfo = async () => {
      if (!infoExercise) return

      // Try to use already available data first
      const maybeExisting = infoExercise.exercise as unknown as AtlasExercise | undefined
      const hasPolishInstructions = Boolean(maybeExisting?.instructions_pl && maybeExisting.instructions_pl.length > 0)
      if (hasPolishInstructions) {
        setInfoDetails(maybeExisting ?? null)
        setInfoLoading(false)
        return
      }

      const idToFetch = maybeExisting?.apiId || maybeExisting?._id || infoExercise.exercise?.apiId || infoExercise.exercise?._id || infoExercise._id
      if (!idToFetch) {
        setInfoLoading(false)
        return
      }

      try {
        setInfoLoading(true)
        const details = await exercisesService.getSwapExerciseById(idToFetch)
        setInfoDetails(details)
      } catch (err) {
        console.error(err)
        // Pozostawiamy bez komunikatu o błędzie, pokażemy fallbackowe "Brak opisu"
        setInfoDetails(maybeExisting || null)
      } finally {
        setInfoLoading(false)
      }
    }

    loadInfo()
  }, [infoExercise])
  const totalSets = useMemo(
    () =>
      plan?.days?.reduce(
        (sum, day) =>
          sum + day.exercises.reduce((daySets, exercise) => daySets + (exercise.sets ?? 0), 0),
        0,
      ) ?? 0,
    [plan],
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!id) return
      try {
        setLoading(true)
        const p = await workoutPlansService.getPlan(id)
        if (!active) return
        setPlan(p)
      } catch (err) {
        console.error(err)
        setError('Nie udało się pobrać planu')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

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
      navigate('/plans')
    } catch (err) {
      console.error(err)
      setError('Usuwanie planu nie powiodło się')
    }
  }

  const handleSetActive = async (planId: string) => {
    if (activating || plan?.isActive) return
    try {
      setError(null)
      setActivating(true)
      await workoutPlansService.setActivePlan(planId)
      setPlan((prev) => (prev ? { ...prev, isActive: true } : prev))
    } catch (err) {
      console.error(err)
      setError('Nie udało się ustawić aktywnego planu')
    } finally {
      setActivating(false)
    }
  }

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000)
  }

  const closeInfoModal = () => {
    setInfoExercise(null)
    setInfoDetails(null)
  }

  const handleDownloadPDF = async () => {
    if (!plan || pdfLoading) return
    setPdfLoading(true)
    try {
      const [{ default: jsPDF }, autoTable] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const FONT_NAME = 'Roboto'
      const FONT_FILE = 'Roboto-Regular.ttf'

      const doc = new jsPDF({ compress: true })
      doc.addFileToVFS(FONT_FILE, fontBase64)
      doc.addFont(FONT_FILE, FONT_NAME, 'normal')
      doc.setFont(FONT_NAME)

      doc.setFontSize(16)
      doc.text('Mój Plan Treningowy - Wirtualny Trener', 14, 18)

    let cursorY = 28
    plan.days.forEach((day, idx) => {
      if (cursorY > 260) {
        doc.addPage()
        cursorY = 20
      }

      doc.setFontSize(13)
      doc.text(`Dzień ${idx + 1}: ${day.name}`, 14, cursorY)

      const tableStartY = cursorY + 4
      const body = day.exercises.map((exercise) => ([
        exercise.name_pl || exercise.name || '—',
        String(exercise.sets ?? '—'),
        exercise.reps ?? '—',
      ]))

      autoTable.default?.(doc, {
        startY: tableStartY,
        head: [['Ćwiczenie', 'Serie', 'Powtórzenia']],
        body,
        styles: { font: FONT_NAME, fontStyle: 'normal', fontSize: 10, valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center', font: FONT_NAME, fontStyle: 'normal', valign: 'middle' },
        bodyStyles: { font: FONT_NAME, fontStyle: 'normal', fontSize: 10, valign: 'middle' },
        columnStyles: {
          0: { halign: 'left', cellWidth: 'auto', valign: 'middle' },
          1: { halign: 'center', cellWidth: 20, valign: 'middle' },
          2: { halign: 'center', cellWidth: 35, valign: 'middle' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })

      // @ts-expect-error - injected by autotable
      cursorY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : tableStartY + 24
    })

    doc.save('plan-treningowy.pdf')
    } finally {
      // Defer to next tick so the loading state renders visibly before resetting
      setTimeout(() => setPdfLoading(false), 0)
    }
  }

  const showSwapNotice = (exerciseId: string, message: string) => {
    setSwapNotice({ exerciseId, message })
    if (swapNoticeTimeoutRef.current) clearTimeout(swapNoticeTimeoutRef.current)
    swapNoticeTimeoutRef.current = setTimeout(() => setSwapNotice(null), 3200)
  }

  const resolveSwapErrorMessage = (err: unknown) => {
    if (isAxiosError(err)) {
      const payload = err.response?.data as { message?: unknown } | undefined
      const message = Array.isArray(payload?.message)
        ? payload?.message[0]
        : payload?.message
      if (typeof message === 'string' && message.trim().length > 0) {
        return message
      }
    }
    return 'Nie znaleziono zamiennika dla tego ćwiczenia.'
  }

  const handleSwapExercise = async (dayId: string, exerciseId: string) => {
    if (!plan) return
    setError(null)
    setSwapNotice(null)
    try {
      setSwapLoadingId(exerciseId)
      const updatedPlan = await workoutPlansService.swapExercise({
        planId: plan._id,
        dayId,
        exerciseToSwapId: exerciseId,
      })

      setPlan(updatedPlan)
      showToast('Ćwiczenie wymienione')
    } catch (err) {
      console.error(err)
      showSwapNotice(exerciseId, resolveSwapErrorMessage(err))
      setError(null)
    } finally {
      setSwapLoadingId(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="loading loading-spinner loading-lg text-primary"></div>
    </div>
  )

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
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Szczegóły planu</h2>
            <p className="text-base-content/70">Szczegółowy widok planu treningowego</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => navigate('/plans')}>Wszystkie plany</button>
          </div>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {plan ? (
          <div className={`space-y-8 ${activating ? 'opacity-70' : ''}`}>
            <WorkoutPlanCard
              plan={plan}
              onDelete={handleDelete}
              onSetActive={handleSetActive}
              variant="hero"
            />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryTile label="Dni w tygodniu" value={`${daysPerWeek}`} icon="📅" />
              <SummaryTile label="Łącznie ćwiczeń" value={`${totalExercises}`} icon="💪" />
              <SummaryTile label="Łącznie serii" value={`${totalSets}`} icon="🧮" />
            </section>

            <section className="space-y-4">
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-base-content">Struktura tygodnia</h3>
                  <p className="text-base-content/70 text-sm">
                    Szczegółowy rozkład ćwiczeń dla każdego dnia planu.
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn btn-primary gap-2 ${pdfLoading ? 'loading' : ''}`}
                  onClick={handleDownloadPDF}
                  disabled={!plan || pdfLoading}
                >
                  {!pdfLoading && <Download className="w-4 h-4" />}
                  {pdfLoading ? 'Przygotowywanie PDF...' : 'Pobierz plan (PDF)'}
                </button>
              </header>

              {plan.days.map((day, index) => (
                <div key={day._id} className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                  <div className="flex justify-between flex-wrap gap-3 px-5 py-4 border-b border-base-300">
                    <div>
                      <p className="text-sm text-base-content/60">Dzień {index + 1}</p>
                      <h4 className="text-lg font-semibold text-base-content">{day.name}</h4>
                    </div>
                    <span className="badge badge-outline badge-lg self-start">
                      {day.exercises.length} ćwiczeń
                    </span>
                  </div>

                  <ul className="divide-y divide-base-200">
                    {day.exercises.map((exercise) => (
                      <li key={exercise._id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="min-w-0">
                            <p className="font-medium text-base-content">{exercise.name_pl}</p>
                            <p className="text-xs text-base-content/60 uppercase tracking-wide">
                              {exercise.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-base-content"
                            aria-label="Szczegóły ćwiczenia"
                            title="Szczegóły ćwiczenia"
                            onClick={() => {
                              setInfoExercise(exercise)
                              setInfoDetails(null)
                            }}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-2 relative">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-base-content"
                              aria-label="Wymień ćwiczenie"
                              title="Wymień ćwiczenie"
                              onClick={() => handleSwapExercise(day._id, exercise._id)}
                              disabled={swapLoadingId === exercise._id}
                            >
                              {swapLoadingId === exercise._id ? (
                                <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                              ) : (
                                <Shuffle className="w-4 h-4" />
                              )}
                            </button>
                            {swapNotice?.exerciseId === exercise._id && (
                              <span className="text-xs text-warning bg-base-200 border border-base-300 rounded px-2 py-1 shadow-sm">
                                {swapNotice.message}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-base-content/80 sm:text-right sm:min-w-[120px]">
                          {exercise.sets} serie × {exercise.reps}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>
        ) : (
          <div className="card p-6">Plan nie znaleziony</div>
        )}
      </div>

        {toast && (
          <div className="toast toast-end">
            <div className="alert alert-success flex items-center gap-3 shadow-lg">
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {infoExercise && (
          <div className="modal modal-open">
            <div className="modal-box max-w-xl">
              <h3 className="font-bold text-lg mb-2">
                {infoDetails?.name_pl || (infoExercise.exercise as unknown as AtlasExercise | undefined)?.name_pl || infoExercise.name_pl}
              </h3>

              {infoLoading && (
                <div className="flex items-center gap-2 text-base-content/70">
                  <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                  <span>Ładowanie szczegółów…</span>
                </div>
              )}

              {!infoLoading && (
                (() => {
                  const detailSource = infoDetails || (infoExercise.exercise as unknown as AtlasExercise | undefined)
                  const description = detailSource?.instructions_pl?.length
                    ? detailSource.instructions_pl.join(' ')
                    : 'Brak opisu'
                  const bodyPart = translateMuscle(detailSource?.bodyPart || detailSource?.target)
                  const equipment = translateEquipment(detailSource?.equipment)
                  return (
                <div className="space-y-3 text-base-content/80">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-base-content/60">Opis</p>
                    <p className="mt-1">{description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-base-content/60">Partia mięśniowa</p>
                      <p className="mt-1">{bodyPart}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-base-content/60">Wymagany sprzęt</p>
                      <p className="mt-1">{equipment}</p>
                    </div>
                  </div>
                </div>
                  )
                })()
              )}

              <div className="modal-action">
                <button type="button" className="btn" onClick={closeInfoModal}>Zamknij</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={closeInfoModal} aria-label="Zamknij"></div>
          </div>
        )}
    </div>
  )
}

interface SummaryTileProps {
  label: string
  value: string
  icon: string
}

function SummaryTile({ label, value, icon }: SummaryTileProps) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 px-5 py-4 flex items-center gap-4">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-widest text-base-content/60">{label}</p>
        <p className="text-2xl font-bold text-base-content">{value}</p>
      </div>
    </div>
  )
}
