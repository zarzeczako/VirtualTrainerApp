import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { FormEvent } from 'react'
import { ArrowUp, Bot, User as UserIcon } from 'lucide-react'
import AppHeader from '../../../components/AppHeader'
import PublicNavbar from '../../../components/PublicNavbar'
import { chatService } from '../../../services/chat.service'
import { authService } from '../../../services/auth.service'
import ProfileSidebar from '../components/ProfileSidebar'
import type { AuthenticatedUser, ProfileEditableFields } from '../models/user.model'
import { getDisplayName } from '../models/user.model'
import { useThemePreference } from '../../../hooks/useThemePreference'

type ChatAuthor = 'user' | 'bot'

type ChatMessage = {
  id: string
  author: ChatAuthor
  text: string
  buttons?: string[]
}

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return generateId()
}

const quickPrompts = [
  'Ćwiczenia na barki',
  'Ćwiczenia z hantlami na klate',
  'Co to jest redukcja?',
  'Jak robić wyciskanie hantlami?',
]

export default function ChatAssistantPage() {
  const location = useLocation()
  const { setTheme } = useThemePreference()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      author: 'bot',
      text: 'Cześć! Jestem Twoim Asystentem treningowym. Zapytaj o ćwiczenia, technikę lub plany treningowe, a postaram się pomóc.',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineEndRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef<string>(createSessionId())
  const forcePublicNavbar = new URLSearchParams(location.search).get('view') === 'public'
  const showPublicNavbar = !isAuthenticated || forcePublicNavbar

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const anchor = timelineEndRef.current
    if (anchor) {
      requestAnimationFrame(() => {
        anchor.scrollIntoView({ behavior, block: 'end' })
      })
      return
    }

    const node = scrollContainerRef.current
    if (node) {
      requestAnimationFrame(() => node.scrollTo({ top: node.scrollHeight, behavior }))
    }
  }, [])

  useEffect(() => {
    scrollToBottom(messages.length > 2 ? 'smooth' : 'auto')
  }, [messages, scrollToBottom])

  useEffect(() => {
    let active = true
    if (!isAuthenticated) {
      setUser(null)
      return () => {
        active = false
      }
    }

    authService
      .getProfile()
      .then((profile: AuthenticatedUser) => {
        if (!active) {
          return
        }
        setUser(profile)
      })
      .catch((profileError: unknown) => {
        if (!active) {
          return
        }
        console.error('Nie udało się pobrać profilu użytkownika:', profileError)
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  useEffect(() => {
    const node = scrollContainerRef.current
    if (!node) {
      return
    }

    const handleScroll = () => {
      setShowScrollToTop(node.scrollTop > 160)
    }

    node.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      node.removeEventListener('scroll', handleScroll)
    }
  }, [messages.length])

  const sendMessage = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed) {
      return
    }

    const userMessage: ChatMessage = {
      id: `user-${generateId()}`,
      author: 'user',
      text: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setError(null)
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage({
        text: trimmed,
        sessionId: sessionIdRef.current,
      })

      const botMessage: ChatMessage = {
        id: `bot-${generateId()}`,
        author: 'bot',
        text: response.text,
        buttons: response.buttons ?? [],
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (sendError) {
      console.error('Failed to send message', sendError)
      const fallback: ChatMessage = {
        id: `bot-${generateId()}`,
        author: 'bot',
        text: 'Ups! Nie udało się połączyć z czatem. Spróbuj ponownie za chwilę.',
      }
      setMessages((prev) => [...prev, fallback])
      setError('Wystąpił problem z połączeniem. Spróbuj ponownie.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading || !inputValue.trim()) {
      return
    }
    const value = inputValue
    setInputValue('')
    void sendMessage(value)
  }

  const handleSuggestionClick = (option: string) => {
    if (isLoading) {
      return
    }
    setInputValue('')
    void sendMessage(option)
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  const handleProfileSave = async (changes: ProfileEditableFields) => {
    try {
      const updated = await authService.updateProfile(changes)
      setUser(updated)
      if (updated.themePreference) {
        setTheme(updated.themePreference)
      }
    } catch (err) {
      console.error('Failed to update profile', err)
      throw err
    }
  }

  const handleAvatarUpload = async (avatarDataUrl: string) => {
    await handleProfileSave({ avatarDataUrl })
  }

  const handleThemeSelect = async (theme: string) => {
    await handleProfileSave({ themePreference: theme })
  }

  const handleEmailChange = async (payload: { newEmail: string; currentPassword: string }) => {
    const updated = await authService.updateEmail(payload)
    setUser(updated)
  }

  const handlePasswordChange = async (payload: { newPassword: string; currentPassword: string }) => {
    await authService.updatePassword(payload)
  }

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const userDisplayName = getDisplayName(user)

  return (
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      {showPublicNavbar ? (
        <PublicNavbar isAuthenticated={isAuthenticated} />
      ) : (
        <AppHeader
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          onAvatarClick={() => setProfileDrawerOpen(true)}
        />
      )}

      <ProfileSidebar
        isOpen={isProfileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        onProfileSave={handleProfileSave}
        onAvatarUpload={handleAvatarUpload}
        onThemeSelect={handleThemeSelect}
        onEmailChange={handleEmailChange}
        onPasswordChange={handlePasswordChange}
      />

      <main className="flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 shadow-xl sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="text-left text-base-content">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                  AI Coach
                </p>
                <h1 className="text-3xl font-bold leading-tight text-base-content sm:text-4xl md:text-5xl">
                  Asystent treningowy AI
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-base-content/80">
                  Prowadź rozmowy o planach, technice i regeneracji. Model utrzymuje kontekst sesji i odpowiada po polsku. Dodaj pytanie albo wybierz jeden z gotowych promptów.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-base-content/80">
                  <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                    Odpowiedzi w czasie rzeczywistym
                  </span>
                  <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    Sesja: {sessionIdRef.current.slice(0, 8)}…
                  </span>
                  <span className="badge gap-2 border-base-300 bg-base-100 text-base-content shadow-sm">
                    <Bot className="h-3.5 w-3.5" /> Dialogflow + personalizacja
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl shadow-base-300/50 ring-1 ring-primary/25">
                <p className="text-xs uppercase tracking-wide text-base-content/80">Szybkie pytania</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="group flex items-center gap-2 rounded-xl border border-base-300 bg-base-100/95 px-3.5 py-2.5 text-left text-sm font-medium text-base-content shadow-md ring-1 ring-base-200 transition hover:-translate-y-0.5 hover:border-primary/70 hover:bg-primary/10 hover:shadow-lg"
                      onClick={() => handleSuggestionClick(prompt)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary transition group-hover:bg-primary" aria-hidden="true" />
                      <span className="leading-snug">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-lg">
            <div className="flex h-[70vh] min-h-[540px] flex-col gap-4">
              <div
                ref={scrollContainerRef}
                className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-base-200 bg-base-200 p-4 pr-6 pb-32"
              >
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    disabled={isLoading}
                    onSuggestionClick={handleSuggestionClick}
                    userAvatarUrl={user?.avatarUrl}
                    userDisplayName={userDisplayName}
                  />
                ))}

                {isLoading && (
                  <div className="chat chat-start">
                    <div className="chat-image avatar">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg">
                        <Bot className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="chat-header mb-1 text-sm font-medium text-base-content/70">AI Trener</div>
                    <div className="chat-bubble bg-base-200 text-base-content">
                      <span className="loading loading-dots loading-sm" aria-label="Bot pisze" />
                    </div>
                  </div>
                )}
                <div ref={timelineEndRef} />
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-2" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-3 shadow-inner sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder="Zadaj pytanie..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    disabled={isLoading}
                    className="input input-bordered w-full"
                  />
                  <button
                    className="btn btn-primary shrink-0 sm:w-32"
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                  >
                    Wyślij
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      {showScrollToTop && (
        <button
          type="button"
          aria-label="Przewiń do początku czatu"
          className="btn btn-circle btn-primary fixed bottom-24 right-8 shadow-lg"
          onClick={handleScrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

type MessageBubbleProps = {
  message: ChatMessage
  disabled: boolean
  onSuggestionClick: (value: string) => void
  userAvatarUrl?: string | null
  userDisplayName: string
}

function MessageBubble({ message, disabled, onSuggestionClick, userAvatarUrl, userDisplayName }: MessageBubbleProps) {
  const isUser = message.author === 'user'
  const header = isUser ? userDisplayName || 'Ty' : 'AI Trener'
  const avatarBase = 'flex h-12 w-12 items-center justify-center rounded-full border border-base-300 shadow-lg overflow-hidden'
  const avatarClass = isUser ? `${avatarBase} bg-neutral text-neutral-content` : `${avatarBase} bg-primary text-primary-content`

  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
      <div className="chat-image avatar">
        <div
          className={`${avatarClass} ${isUser ? 'bg-neutral text-neutral-content' : 'bg-primary text-primary-content'} ring-2 ring-base-200`}
          aria-label={header}
        >
          {isUser ? (
            userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Avatar użytkownika" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-5 w-5" />
            )
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </div>
      </div>
      <div className="chat-header mb-1 text-sm font-medium text-base-content/80">{header}</div>
      <div
        className={`chat-bubble max-w-2xl border border-base-300 bg-base-100 text-base-content shadow-sm ${
          isUser ? 'chat-bubble-primary text-primary-content' : 'chat-bubble-secondary text-base-content'
        }`}
      >
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
      </div>
      {message.buttons && message.buttons.length > 0 && (
        <div className="chat-footer mt-2">
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : ''}`}>
            {message.buttons.map((option) => (
              <button
                key={option}
                type="button"
                className="btn btn-xs sm:btn-sm rounded-full border border-base-300 bg-base-100 text-base-content transition hover:border-primary/60 hover:bg-primary/10"
                disabled={disabled}
                onClick={() => onSuggestionClick(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
