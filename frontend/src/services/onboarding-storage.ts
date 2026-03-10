import type { ProfileEditableFields } from '../pages/home/models/user.model'

const STORAGE_KEY = 'wt:onboarding-profile'

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }
  return window.sessionStorage
}

export const loadOnboardingDraft = (): ProfileEditableFields | null => {
  try {
    const storage = getSessionStorage()
    if (!storage) return null
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ProfileEditableFields
  } catch (error) {
    console.warn('Nie udało się odczytać ankiety z sessionStorage', error)
    return null
  }
}

export const saveOnboardingDraft = (data: ProfileEditableFields): void => {
  try {
    const storage = getSessionStorage()
    if (!storage) return
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Nie udało się zapisać ankiety w sessionStorage', error)
  }
}

export const clearOnboardingDraft = (): void => {
  try {
    const storage = getSessionStorage()
    if (!storage) return
    storage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Nie udało się wyczyścić ankiety z sessionStorage', error)
  }
}
