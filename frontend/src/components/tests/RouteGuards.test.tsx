import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Mocked } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'
import PublicRoute from '../PublicRoute'
import { authService } from '../../services/auth.service'

vi.mock('../../services/auth.service', () => ({
  authService: {
    isAuthenticated: vi.fn(),
  },
}))

const mockedAuthService = authService as Mocked<typeof authService>

const renderWithRoutes = (ui: React.ReactNode, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard View</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Route guards', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('redirects guests away from protected content', () => {
    mockedAuthService.isAuthenticated.mockReturnValue(false)

    renderWithRoutes(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
      ['/']
    )

    expect(screen.getByText(/login page/i)).toBeInTheDocument()
  })

  it('renders protected children for authenticated users', () => {
    mockedAuthService.isAuthenticated.mockReturnValue(true)

    renderWithRoutes(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
      ['/']
    )

    expect(screen.getByText(/secret content/i)).toBeInTheDocument()
  })

  it('redirects authenticated users away from public routes', () => {
    mockedAuthService.isAuthenticated.mockReturnValue(true)

    renderWithRoutes(
      <PublicRoute>
        <div>Login Form</div>
      </PublicRoute>,
      ['/']
    )

    expect(screen.getByText(/dashboard view/i)).toBeInTheDocument()
  })

  it('renders public content for guests', () => {
    mockedAuthService.isAuthenticated.mockReturnValue(false)

    renderWithRoutes(
      <PublicRoute>
        <div>Login Form</div>
      </PublicRoute>,
      ['/']
    )

    expect(screen.getByText(/login form/i)).toBeInTheDocument()
  })
})
