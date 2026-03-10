import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Mocked } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'
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
    login: vi.fn(),
    updateProfile: vi.fn(),
    getProfile: vi.fn(),
  },
}))

const mockedAuthService = authService as Mocked<typeof authService>

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )

describe('Login page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockNavigate.mockReset()
    localStorage.clear()
    mockedAuthService.getProfile.mockResolvedValue({
      _id: 'u1',
      email: 'ania@example.com',
      role: 'user',
    })
  })

  it('pokazuje błędy walidacji przy pustym formularzu', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /^Zaloguj się$/i }))

    expect(await screen.findByText(/email jest wymagany/i)).toBeVisible()
    expect(await screen.findByText(/hasło jest wymagane/i)).toBeVisible()
  })

  it('loguje użytkownika i przekierowuje na dashboard', async () => {
    const user = userEvent.setup()
    mockedAuthService.login.mockResolvedValue({ access_token: 'token-123' })

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'ania@example.com')
    await user.type(screen.getByLabelText(/hasło/i), 'sekretnehaslo')

    await user.click(screen.getByRole('button', { name: /^Zaloguj się$/i }))

    await waitFor(() => {
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        email: 'ania@example.com',
        password: 'sekretnehaslo',
      })
    })

    expect(sessionStorage.getItem('token')).toBe('token-123')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('wyświetla komunikat błędu z API', async () => {
    const user = userEvent.setup()
    mockedAuthService.login.mockRejectedValue({
      response: { data: { message: 'Niepoprawne dane logowania' } },
    })

    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'ania@example.com')
    await user.type(screen.getByLabelText(/hasło/i), 'sekretnehaslo')
    await user.click(screen.getByRole('button', { name: /^Zaloguj się$/i }))

    expect(await screen.findByText(/niepoprawne dane logowania/i)).toBeVisible()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
