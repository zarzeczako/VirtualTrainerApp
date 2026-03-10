import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AppHeader from '../AppHeader'
import type { AuthenticatedUser } from '../../pages/home/models/user.model'

type AppHeaderProps = React.ComponentProps<typeof AppHeader>

const renderHeader = (override?: Partial<AppHeaderProps>) => {
  const props: AppHeaderProps = {
    isAuthenticated: false,
    user: null,
    onLogout: vi.fn(),
    ...override,
  }

  return {
    ...render(
      <MemoryRouter>
        <AppHeader {...props} />
      </MemoryRouter>
    ),
    props,
  }
}

describe('AppHeader', () => {
  it('pokazuje linki nawigacyjne i przyciski CTA dla gości', () => {
    renderHeader()

    // Logo present
    expect(screen.getByAltText(/Wirtualny Trener Logo/i)).toBeVisible()
    // Navigation links
    expect(screen.getByRole('link', { name: /plan ćwiczeń/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /atlas ćwiczeń/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /postęp/i })).toBeVisible()
    // Auth CTA
    expect(screen.getByRole('link', { name: /zaloguj się/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /rozpocznij teraz/i })).toBeVisible()
  })

  it('wyświetla dane użytkownika i obsługuje wylogowanie', async () => {
    const authenticatedUser: AuthenticatedUser = {
      email: 'ania@example.com',
      name: 'Ania Kowalska',
      firstName: 'Ania',
      lastName: 'Kowalska',
    }

    const { props } = renderHeader({
      isAuthenticated: true,
      user: authenticatedUser,
    })

    expect(screen.getByText(/ania kowalska/i)).toBeVisible()

    const logoutButton = screen.getByRole('button', { name: /wyloguj się/i })
    expect(logoutButton).toBeVisible()

    const user = userEvent.setup()
    await user.click(logoutButton)

    expect(props.onLogout).toHaveBeenCalledTimes(1)
  })
})
