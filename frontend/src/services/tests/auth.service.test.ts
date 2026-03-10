import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import AxiosMockAdapter from 'axios-mock-adapter'
import http from '../http'
import { authService } from '../auth.service'

let mock: AxiosMockAdapter

beforeEach(() => {
  mock = new AxiosMockAdapter(http)
  sessionStorage.clear()
})

afterEach(() => {
  mock.restore()
})

describe('authService', () => {
  it('loguje użytkownika i zwraca token', async () => {
    mock.onPost('/auth/login').reply(200, { access_token: 'jwt-token' })

    const result = await authService.login({ email: 'ania@example.com', password: 'tajne' })

    expect(result).toEqual({ access_token: 'jwt-token' })
  })

  it('normalizuje profil z dowolnym polem identyfikatora', async () => {
    mock.onGet('/auth/profile').reply(200, {
      email: 'ania@example.com',
      _id: 'mongo-id',
    })

    const profile = await authService.getProfile()

    expect(profile).toMatchObject({
      email: 'ania@example.com',
      id: 'mongo-id',
    })
  })

  it('wysyła token w nagłówku podczas aktualizacji profilu', async () => {
    sessionStorage.setItem('token', 'jwt-token')

    mock.onPatch('/users/me/profile').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer jwt-token')
      return [200, { email: 'ania@example.com', id: '123' }]
    })

    const updated = await authService.updateProfile({ city: 'Warszawa' })

    expect(updated).toMatchObject({ email: 'ania@example.com', id: '123' })
  })

  it('propaguje błąd backendu przy próbie zmiany emaila', async () => {
    mock.onPatch('/users/me/email').reply(400, { message: 'Zły token' })

    await expect(
      authService.updateEmail({ currentPassword: 'old', newEmail: 'nowy@example.com' })
    ).rejects.toMatchObject({ response: { status: 400, data: { message: 'Zły token' } } })
  })

  it('czyści token z sessionStorage po wylogowaniu', () => {
    sessionStorage.setItem('token', 'jwt-token')

    authService.logout()

    expect(sessionStorage.getItem('token')).toBeNull()
  })
})
