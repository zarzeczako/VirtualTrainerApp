import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure DOM is reset between tests
afterEach(() => {
  cleanup()
})

// Simple in-memory storage mock for Vitest/node environment
const createStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
}

// Force-assign storage mocks to avoid environment differences
Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorageMock(),
  configurable: true,
  writable: true,
})
