export type ApiError = {
  response?: {
    status?: number
    data?: {
      message?: string
    }
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'response' in error
}

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (isApiError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
