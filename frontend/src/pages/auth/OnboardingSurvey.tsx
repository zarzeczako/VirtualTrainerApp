import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import PublicNavbar from '../../components/PublicNavbar'
import { authService } from '../../services/auth.service'
import type { ProfileEditableFields } from '../home/models/user.model'
import { loadOnboardingDraft, saveOnboardingDraft } from '../../services/onboarding-storage'

const toFormValues = (draft: ProfileEditableFields | null) => ({
  firstName: draft?.firstName ?? '',
  lastName: draft?.lastName ?? '',
  name: draft?.name ?? '',
  city: draft?.city ?? '',
  weightKg: draft?.weightKg ? String(draft.weightKg) : '',
  heightCm: draft?.heightCm ? String(draft.heightCm) : '',
  bio: draft?.bio ?? '',
  birthDate: draft?.birthDate?.slice(0, 10) ?? '',
})

type OnboardingFormValues = ReturnType<typeof toFormValues>

const normalizeDraft = (values: OnboardingFormValues): ProfileEditableFields => {
  const parseNumber = (value: string): number | undefined => {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return {
    firstName: values.firstName?.trim() || undefined,
    lastName: values.lastName?.trim() || undefined,
    name: values.name?.trim() || undefined,
    city: values.city?.trim() || undefined,
    weightKg: parseNumber(values.weightKg),
    heightCm: parseNumber(values.heightCm),
    bio: values.bio?.trim() || undefined,
    birthDate: values.birthDate || undefined,
  }
}

export default function OnboardingSurvey() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors, isValid },
  } = useForm<OnboardingFormValues>({
    defaultValues: toFormValues(loadOnboardingDraft()),
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const isAuthenticated = authService.isAuthenticated()

  useEffect(() => {
    // If authenticated, load profile instead of draft
    if (isAuthenticated) {
      // User is logged in via OAuth, just needs to fill onboarding
      const stored = loadOnboardingDraft()
      if (stored) {
        reset(toFormValues(stored))
      }
    } else {
      // Not authenticated, redirect to home if they somehow ended up here
      const stored = loadOnboardingDraft()
      if (stored) {
        reset(toFormValues(stored))
      }
    }
  }, [reset, isAuthenticated])

  const onSubmit = async (values: OnboardingFormValues) => {
    const profileDraft = normalizeDraft(values)
    
    if (isAuthenticated) {
      // User is logged in via OAuth - complete onboarding
      try {
        await authService.completeOnboarding(profileDraft)
        // Clear draft and redirect to dashboard
        localStorage.removeItem('onboarding-draft')
        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('Failed to complete onboarding:', error)
        // Handle error - show notification
      }
    } else {
      // User is not authenticated - save draft and go to register
      saveOnboardingDraft(profileDraft)
      navigate('/register', { state: { fromOnboarding: true } })
    }
  }

  const submitDisabled = isSubmitting || !isValid

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-200 via-base-200 to-base-100">
      <PublicNavbar isAuthenticated={isAuthenticated} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-base-content mt-3">Poznajmy Twoje cele</h1>
          <p className="text-base-content/70 max-w-3xl mx-auto mt-5 leading-relaxed">
            Ta krótka ankieta pozwoli nam stworzyć kierunek idealnie dopasowany do Twojej sylwetki i stylu życia.
            Odpowiedzi przechowujemy lokalnie i dodamy do profilu dopiero po zakończeniu rejestracji.
          </p>
        </div>
        <div className="card bg-base-100/90 backdrop-blur shadow-[0_25px_80px_rgba(15,23,42,0.2)]">
          <div className="card-body">
            <form className="space-y-10" onSubmit={handleSubmit(onSubmit)}>
              <section className="rounded-2xl border border-base-200 bg-base-200/40 p-6">
                <div className="flex flex-col gap-2 mb-6">
                  <p className="text-xs font-semibold tracking-[0.3em] text-base-content/60">ETAP 1</p>
                  <h2 className="text-2xl font-bold text-base-content">Podstawowe dane</h2>
                  <p className="text-base-content/60">
                    Twoje imię i preferencje wyświetlania ułatwią spersonalizowanie komunikacji w aplikacji.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="firstName">Imię</label>
                    <input
                      id="firstName"
                      type="text"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.firstName)}
                      {...register('firstName', {
                        required: 'Imię jest wymagane',
                        minLength: { value: 2, message: 'Imię musi mieć co najmniej 2 znaki' },
                        maxLength: { value: 50, message: 'Imię może mieć maksymalnie 50 znaków' },
                      })}
                    />
                    {errors.firstName && <p className="text-xs text-error mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="lastName">Nazwisko</label>
                    <input
                      id="lastName"
                      type="text"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.lastName)}
                      {...register('lastName', {
                        required: 'Nazwisko jest wymagane',
                        minLength: { value: 2, message: 'Nazwisko musi mieć co najmniej 2 znaki' },
                        maxLength: { value: 60, message: 'Nazwisko może mieć maksymalnie 60 znaków' },
                      })}
                    />
                    {errors.lastName && <p className="text-xs text-error mt-1">{errors.lastName.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="name">Nazwa wyświetlana</label>
                    <input
                      id="name"
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="np. Michał"
                      aria-invalid={Boolean(errors.name)}
                      {...register('name', {
                        required: 'Nazwa wyświetlana jest wymagana',
                        minLength: { value: 3, message: 'Użyj przynajmniej 3 znaków' },
                        maxLength: { value: 40, message: 'Nazwa może mieć maksymalnie 40 znaków' },
                      })}
                    />
                    <p className="text-xs text-base-content/60 mt-1">Widoczna w kartach planów i asystencie AI.</p>
                    {errors.name && <p className="text-xs text-error mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="city">Miasto</label>
                    <input
                      id="city"
                      type="text"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.city)}
                      {...register('city', {
                        required: 'Miasto jest wymagane',
                        minLength: { value: 2, message: 'Miasto musi mieć co najmniej 2 znaki' },
                        maxLength: { value: 80, message: 'Miasto może mieć maksymalnie 80 znaków' },
                      })}
                    />
                    {errors.city && <p className="text-xs text-error mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="birthDate">Data urodzenia</label>
                    <input
                      id="birthDate"
                      type="date"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.birthDate)}
                      {...register('birthDate', {
                        required: 'Data urodzenia jest wymagana',
                        validate: (value) => {
                          if (!value) return 'Data urodzenia jest wymagana'
                          const parsed = new Date(value)
                          const now = new Date()
                          if (Number.isNaN(parsed.getTime())) return 'Podaj poprawną datę'
                          if (parsed > now) return 'Data nie może być w przyszłości'
                          return true
                        },
                      })}
                    />
                    {errors.birthDate && <p className="text-xs text-error mt-1">{errors.birthDate.message}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-base-200 bg-base-200/40 p-6">
                <div className="flex flex-col gap-2 mb-6">
                  <p className="text-xs font-semibold tracking-[0.3em] text-base-content/60">ETAP 2</p>
                  <h2 className="text-2xl font-bold text-base-content">Parametry fizyczne</h2>
                  <p className="text-base-content/60">Im dokładniejsze dane, tym trafniejsze rekomendacje obciążenia.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="weightKg">Waga (kg)</label>
                    <input
                      id="weightKg"
                      type="number"
                      min="0"
                      step="0.1"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.weightKg)}
                      {...register('weightKg', {
                        required: 'Waga jest wymagana',
                        validate: (value) => {
                          const parsed = Number(value)
                          if (!Number.isFinite(parsed)) return 'Podaj liczbę'
                          if (parsed < 30 || parsed > 250) return 'Waga musi mieścić się w przedziale 30-250 kg'
                          return true
                        },
                      })}
                    />
                    {errors.weightKg && <p className="text-xs text-error mt-1">{errors.weightKg.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="heightCm">Wzrost (cm)</label>
                    <input
                      id="heightCm"
                      type="number"
                      min="0"
                      step="0.5"
                      className="input input-bordered w-full"
                      aria-invalid={Boolean(errors.heightCm)}
                      {...register('heightCm', {
                        required: 'Wzrost jest wymagany',
                        validate: (value) => {
                          const parsed = Number(value)
                          if (!Number.isFinite(parsed)) return 'Podaj liczbę'
                          if (parsed < 120 || parsed > 230) return 'Wzrost musi mieścić się w przedziale 120-230 cm'
                          return true
                        },
                      })}
                    />
                    {errors.heightCm && <p className="text-xs text-error mt-1">{errors.heightCm.message}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-base-200 bg-base-200/40 p-6">
                <div className="flex flex-col gap-2 mb-6">
                  <p className="text-xs font-semibold tracking-[0.3em] text-base-content/60">ETAP 3</p>
                  <h2 className="text-2xl font-bold text-base-content">Twój opis</h2>
                  <p className="text-base-content/60">Kilka zdań, które pomogą trenerowi AI lepiej Cię poznać.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-base-content mb-2 block" htmlFor="bio">Napisz kilka zdań o sobie</label>
                  <textarea
                    id="bio"
                    className="textarea textarea-bordered min-h-[150px] w-full"
                    aria-invalid={Boolean(errors.bio)}
                    {...register('bio', {
                      required: 'Opisz siebie i swoje treningi',
                      minLength: { value: 20, message: 'Dodaj przynajmniej 20 znaków' },
                      maxLength: { value: 1000, message: 'Opis może mieć maksymalnie 1000 znaków' },
                    })}
                    placeholder="Jak trenujesz, jak wygląda Twój dzień, co Cię motywuje..."
                  />
                  {errors.bio && <p className="text-xs text-error mt-1">{errors.bio.message}</p>}
                </div>
              </section>

              <div className="flex justify-center pt-2">
                <button type="submit" className="btn btn-primary btn-wide" disabled={submitDisabled}>
                  {isAuthenticated ? 'Zakończ konfigurację profilu' : 'Przejdź do rejestracji'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
