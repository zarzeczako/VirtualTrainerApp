import { describe, expect, vi, beforeEach, afterEach, afterAll, test } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlanDetailPage from './PlanDetailPage'

const mockGetPlan = vi.hoisted(() => vi.fn())
const mockSwapExercise = vi.hoisted(() => vi.fn())
const mockGetProfile = vi.hoisted(() => vi.fn())
const mockGetSwapExerciseById = vi.hoisted(() => vi.fn())

vi.mock('../services/workoutPlans.api', () => ({
  workoutPlansService: {
    getPlan: mockGetPlan,
    swapExercise: mockSwapExercise,
    deletePlan: vi.fn(),
    setActivePlan: vi.fn(),
  },
}))

vi.mock('../../../services/auth.service', () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
    getProfile: mockGetProfile,
    logout: vi.fn(),
    updateProfile: vi.fn(),
    updateEmail: vi.fn(),
    updatePassword: vi.fn(),
  },
}))

vi.mock('../../../services/exercises.service', () => ({
  exercisesService: {
    getSwapExerciseById: mockGetSwapExerciseById,
  },
  // re-export type name for casts
  Exercise: {} as unknown,
}))

// Simplify heavy components so tests focus on behaviors
vi.mock('../../../components/AppHeader', () => ({ default: () => <div data-testid="app-header" /> }))
vi.mock('../components/WorkoutPlanCard', () => ({ default: () => <div data-testid="workout-card" /> }))
vi.mock('../components/ProfileSidebar', () => ({ default: () => <div data-testid="profile-sidebar" /> }))

// Mock PDF libs
const saveMock = vi.fn()
const addFont = vi.fn()
const setFont = vi.fn()
const addFileToVFS = vi.fn()
const setFontSize = vi.fn()
const text = vi.fn()
const addPage = vi.fn()

const jsPDFConstructor = vi.fn(function jsPDF() {
  return {
    save: saveMock,
    addFont,
    addFileToVFS,
    setFont,
    setFontSize,
    text,
    addPage,
  }
})

vi.mock('jspdf', () => ({
  default: jsPDFConstructor,
}))

const autoTableMock = vi.fn()
vi.mock('jspdf-autotable', () => ({
  default: autoTableMock,
}))
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

const renderWithRouter = () => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/plans/plan-1' }]}>
      <Routes>
        <Route path="/plans/:id" element={<PlanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const basePlan = {
  _id: 'plan-1',
  user: 'user-1',
  name: 'Plan Test',
  level: 'beginner',
  goal: 'general',
  daysPerWeek: 1,
  equipment: 'body-weight',
  days: [
    {
      _id: 'day-1',
      name: 'Poniedziałek',
      exercises: [
        {
          _id: 'ex-1',
          name: 'Push Up',
          name_pl: 'Pompki',
          sets: 3,
          reps: '10',
          rest: '60s',
          exercise: {
            _id: 'ex-1',
            apiId: 'ex-1',
            name: 'Push Up',
            name_pl: 'Pompki',
            bodyPart: 'chest',
            target: 'chest',
            equipment: 'body weight',
            instructions_pl: ['Opuszczaj ciało powoli.'],
          },
        },
      ],
    },
  ],
  createdAt: '',
  updatedAt: '',
}

beforeEach(() => {
  vi.resetAllMocks()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  mockGetPlan.mockResolvedValue(basePlan)
  mockGetProfile.mockResolvedValue({ _id: 'u1', email: 'a@b.com', role: 'user' })
  mockGetSwapExerciseById.mockResolvedValue({
    _id: 'ex-1',
    apiId: 'ex-1',
    name: 'Push Up',
    name_pl: 'Pompki',
    bodyPart: 'chest',
    target: 'chest',
    equipment: 'body weight',
    instructions_pl: ['Opuszczaj ciało powoli.'],
  })
})

afterEach(() => {
  vi.clearAllMocks()
  consoleErrorSpy?.mockRestore()
})

afterAll(() => {
  consoleErrorSpy?.mockRestore()
})

describe('PlanDetailPage - PDF export', () => {
  test('triggers jsPDF save and toggles loading text', async () => {
    renderWithRouter()

    const downloadButton = await screen.findByRole('button', { name: /pobierz plan \(pdf\)/i })
    await userEvent.click(downloadButton)

    await waitFor(() => expect(jsPDFConstructor).toHaveBeenCalledTimes(1))

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalledWith('plan-treningowy.pdf')
    })

    await waitFor(() => {
      expect(downloadButton).toHaveTextContent(/pobierz plan \(pdf\)/i)
    })
  })
})

describe('PlanDetailPage - Summary', () => {
  test('renders correct totals for days, exercises and sets', async () => {
    renderWithRouter()

    const daysLabel = await screen.findByText(/dni w tygodniu/i)
    const daysValue = daysLabel.parentElement?.querySelector('.text-2xl')
    expect(daysValue?.textContent).toBe('1')

    const exercisesLabel = screen.getByText(/łącznie ćwiczeń/i)
    const exercisesValue = exercisesLabel.parentElement?.querySelector('.text-2xl')
    expect(exercisesValue?.textContent).toBe('1')

    const setsLabel = screen.getByText(/łącznie serii/i)
    const setsValue = setsLabel.parentElement?.querySelector('.text-2xl')
    expect(setsValue?.textContent).toBe('3')
  })
})

describe('PlanDetailPage - Swap exercise', () => {
  test('shows loading, swaps exercise, shows toast', async () => {
    const updatedPlan = {
      ...basePlan,
      days: [
        {
          ...basePlan.days[0],
          exercises: [
            {
              _id: 'ex-1-new',
              name: 'Diamond Push Up',
              name_pl: 'Pompki diamentowe',
              sets: 4,
              reps: '12',
              rest: '60s',
              exercise: {
                _id: 'ex-1-new',
                apiId: 'ex-1-new',
                name: 'Diamond Push Up',
                name_pl: 'Pompki diamentowe',
                bodyPart: 'chest',
                target: 'chest',
                equipment: 'body weight',
                instructions_pl: ['Utrzymuj łokcie blisko ciała.'],
              },
            },
          ],
        },
      ],
    }

    const swapPromise = Promise.resolve(updatedPlan)
    mockSwapExercise.mockReturnValueOnce(swapPromise)

    renderWithRouter()

    const swapButton = await screen.findByLabelText(/wymień ćwiczenie/i)
    await userEvent.click(swapButton)

    await waitFor(() => expect(swapButton).toBeDisabled())

    await swapPromise

    await waitFor(() => {
      expect(screen.queryByText('Pompki')).not.toBeInTheDocument()
      expect(screen.getByText('Pompki diamentowe')).toBeInTheDocument()
      expect(screen.getByText(/Ćwiczenie wymienione/i)).toBeInTheDocument()
    })
  })

  test('shows inline notice when no swap alternative is found', async () => {
    mockSwapExercise.mockRejectedValueOnce({
      response: { data: { message: 'Nie znaleziono alternatywnych ćwiczeń w Bibliotece Swapów.' } },
    })

    renderWithRouter()

    const swapButton = await screen.findByLabelText(/wymień ćwiczenie/i)
    await userEvent.click(swapButton)

    await waitFor(() =>
      expect(
        screen.getByText(/nie znaleziono zamiennika|alternatywnych ćwiczeń/i),
      ).toBeInTheDocument(),
    )

    await waitFor(() =>
      expect(
        screen.queryByText(/nie znaleziono zamiennika|alternatywnych ćwiczeń/i),
      ).not.toBeInTheDocument(),
      { timeout: 5000 },
    )
  })

  test.todo('restores original exercise after clicking Cofnij (Undo) once undo UI is available')
})

describe('PlanDetailPage - Exercise info modal', () => {
  test('opens modal and shows Polish details, then closes', async () => {
    renderWithRouter()

    const infoButton = await screen.findByLabelText(/szczegóły ćwiczenia/i)
    await userEvent.click(infoButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pompki' })).toBeInTheDocument()
      expect(screen.getByText(/Opis/i)).toBeInTheDocument()
      expect(screen.getByText(/Opuszczaj ciało powoli/i)).toBeInTheDocument()
      expect(screen.getByText(/Partia mięśniowa/i)).toBeInTheDocument()
      expect(screen.getByText(/Wymagany sprzęt/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /zamknij/i }))

    await waitFor(() => {
      expect(screen.queryByText(/Opis/i)).not.toBeInTheDocument()
    })
  })
})