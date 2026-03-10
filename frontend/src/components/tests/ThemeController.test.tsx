import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'

vi.mock('../../services/auth.service', () => ({
  authService: {
    isAuthenticated: vi.fn(() => false),
    updateProfile: vi.fn(() => Promise.resolve({})),
  },
}))

import ThemeController from '../ThemeController'
import { authService } from '../../services/auth.service'

const mockedAuthService = authService as Mocked<typeof authService>

const renderController = () => render(<ThemeController />)

describe('ThemeController', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
    mockedAuthService.isAuthenticated.mockReturnValue(false)
  })

  it('inicjalizuje motyw z localStorage', () => {
    localStorage.setItem('theme', 'dark')

    renderController()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
  })

  it('zmienia motyw i wysyła zdarzenie synchronizujące', async () => {
    localStorage.setItem('theme', 'light')
    const user = userEvent.setup()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    renderController()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /dark/i }))

    expect(mockedAuthService.updateProfile).not.toHaveBeenCalled()

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: 'dark' }))
  })

  it('zamyka dropdown po kliknięciu na zewnątrz i reaguje na event globalny', async () => {
    const user = userEvent.setup()

    renderController()

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('listbox')).toBeVisible()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('wt:theme-changed', { detail: 'retro' }))
    })

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('retro')
    })
    expect(screen.getByRole('button', { name: /retro/i })).toBeInTheDocument()
  })

  it('zapisuje motyw w profilu gdy użytkownik jest zalogowany', async () => {
    const user = userEvent.setup()
    mockedAuthService.isAuthenticated.mockReturnValue(true)

    renderController()

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: /dark/i }))

    await waitFor(() => {
      expect(mockedAuthService.updateProfile).toHaveBeenCalledWith({ themePreference: 'dark' })
    })
  })
})
