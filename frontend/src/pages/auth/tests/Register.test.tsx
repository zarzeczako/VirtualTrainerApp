import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Mocked } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Register from '../Register'
import { authService } from '../../../services/auth.service'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
  },
}))

const mockedAuthService = authService as Mocked<typeof authService>

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )

describe('Register page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockNavigate.mockReset()
    localStorage.clear()
  })

  it('wymusza walidację pustego formularza', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: /zarejestruj się/i }))

    expect(await screen.findByText(/email jest wymagany/i)).toBeVisible()
    expect(await screen.findByText(/hasło jest wymagane/i)).toBeVisible()
    expect(await screen.findByText(/potwierdzenie hasła jest wymagane/i)).toBeVisible()
  })

  it('wyświetla błąd gdy hasła się różnią', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/email/i), 'ania@example.com')
    await user.type(screen.getByLabelText(/^hasło$/i), 'tajnehaslo')
    await user.type(screen.getByLabelText(/potwierdź hasło/i), 'innehaslo')
    await user.click(screen.getByRole('button', { name: /zarejestruj się/i }))

    expect(await screen.findByText(/hasła muszą być identyczne/i)).toBeVisible()
  })

  it('rejestruje i loguje użytkownika, zapisując token', async () => {
    const user = userEvent.setup()
    mockedAuthService.register.mockResolvedValueOnce({ email: 'ania@example.com' })
    mockedAuthService.login.mockResolvedValueOnce({ access_token: 'token-abc' })

    renderRegister()

    await user.type(screen.getByLabelText(/email/i), 'ania@example.com')
    await user.type(screen.getByLabelText(/^hasło$/i), 'tajnehaslo')
    await user.type(screen.getByLabelText(/potwierdź hasło/i), 'tajnehaslo')
    await user.click(screen.getByRole('button', { name: /zarejestruj się/i }))

    await waitFor(() => {
      expect(mockedAuthService.register).toHaveBeenCalledWith({
        email: 'ania@example.com',
        password: 'tajnehaslo',
      })
    })

    expect(mockedAuthService.login).toHaveBeenCalledWith({
      email: 'ania@example.com',
      password: 'tajnehaslo',
    })
    expect(sessionStorage.getItem('token')).toBe('token-abc')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('pokazuje komunikat błędu zwrócony z API', async () => {
    const user = userEvent.setup()
    mockedAuthService.register.mockRejectedValueOnce({
      response: { data: { message: 'Email zajęty' } },
    })

    renderRegister()

    await user.type(screen.getByLabelText(/email/i), 'ania@example.com')
    await user.type(screen.getByLabelText(/^hasło$/i), 'tajnehaslo')
    await user.type(screen.getByLabelText(/potwierdź hasło/i), 'tajnehaslo')
    await user.click(screen.getByRole('button', { name: /zarejestruj się/i }))

    expect(await screen.findByText(/email zajęty/i)).toBeVisible()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
