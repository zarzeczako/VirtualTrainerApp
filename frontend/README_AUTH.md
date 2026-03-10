# Wirtualny Trener - Ekrany Logowania i Rejestracji

## 📋 Utworzone pliki

### Strony uwierzytelniania
- `src/pages/auth/Login.tsx` - Ekran logowania
- `src/pages/auth/Register.tsx` - Ekran rejestracji

### Komponenty
- `src/components/ProtectedRoute.tsx` - Komponent zabezpieczający chronione trasy
- `src/components/PublicRoute.tsx` - Komponent dla publicznych tras (przekierowuje zalogowanych użytkowników)

### Serwisy
- `src/services/auth.service.ts` - Serwis do komunikacji z API uwierzytelniania

### Router
- `src/app/router/index.tsx` - Konfiguracja routingu aplikacji

### Konfiguracja
- `.env` - Zmienne środowiskowe (VITE_API_URL)
- `.env.example` - Przykładowy plik zmiennych środowiskowych
- `src/vite-env.d.ts` - Definicje typów TypeScript dla Vite

## 🎨 Funkcjonalności

### Ekran logowania (`/login`)
- ✅ Formularz z walidacją (email, hasło)
- ✅ Obsługa błędów
- ✅ Stan ładowania
- ✅ Responsywny design z Tailwind CSS
- ✅ Dark mode support
- ✅ Link do rejestracji

### Ekran rejestracji (`/register`)
- ✅ Formularz z polami: email, hasło, potwierdzenie hasła, imię (opcjonalne)
- ✅ Walidacja po stronie klienta:
  - Email - wymagany, poprawny format
  - Hasło - min. 6 znaków, max. 128 znaków
  - Potwierdzenie hasła - musi być identyczne z hasłem
  - Imię - opcjonalne, max. 100 znaków
- ✅ Automatyczne logowanie po rejestracji
- ✅ Obsługa błędów
- ✅ Stan ładowania
- ✅ Link do logowania

### Dashboard (`/dashboard`)
- ✅ Zabezpieczony - wymaga logowania
- ✅ Wyświetla informacje o użytkowniku
- ✅ Przycisk wylogowania
- ✅ Nawigacja

## 🔐 Routing i bezpieczeństwo

### Trasy aplikacji:
- `/` - Przekierowanie do `/login`
- `/login` - Ekran logowania (publiczny)
- `/register` - Ekran rejestracji (publiczny)
- `/dashboard` - Panel główny (chroniony)

### Mechanizmy bezpieczeństwa:
- `ProtectedRoute` - Wymaga tokenu JWT, przekierowuje do logowania jeśli brak
- `PublicRoute` - Przekierowuje do dashboard jeśli użytkownik jest zalogowany
- Token przechowywany w `localStorage`

## 🚀 Jak uruchomić

1. **Upewnij się, że backend działa:**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

2. **Zainstaluj zależności frontend (jeśli nie zainstalowane):**
   ```bash
   cd frontend
   npm install
   ```

3. **Sprawdź plik `.env`:**
   ```
   VITE_API_URL=http://localhost:3000
   ```

4. **Uruchom aplikację:**
   ```bash
   npm run dev
   ```

5. **Otwórz przeglądarkę:**
   ```
   http://localhost:5173
   ```

## 📡 Integracja z API

### Endpointy wykorzystywane przez frontend:

#### POST `/auth/register`
```typescript
{
  email: string;
  password: string;
  name?: string;
}
```

#### POST `/auth/login`
```typescript
{
  email: string;
  password: string;
}
```
Odpowiedź:
```typescript
{
  access_token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  }
}
```

#### GET `/auth/profile`
Wymaga: `Authorization: Bearer <token>`
Odpowiedź:
```typescript
{
  id: string;
  email: string;
  name?: string;
}
```

## 🎨 Stylowanie

- **Tailwind CSS** - utility-first CSS framework
- **Responsywny design** - działa na wszystkich urządzeniach
- **Dark mode** - automatyczne przełączanie trybu ciemnego
- **Gradient backgrounds** - nowoczesny wygląd
- **Smooth transitions** - płynne animacje

## 📝 Walidacja formularzy

Wykorzystano **React Hook Form** do:
- Zarządzania stanem formularzy
- Walidacji w czasie rzeczywistym
- Wyświetlania komunikatów błędów
- Obsługi submit

## 🔄 Przepływ użytkownika

1. **Nowy użytkownik:**
   - Odwiedza `/` → przekierowanie do `/login`
   - Klika "Zarejestruj się" → `/register`
   - Wypełnia formularz → auto-logowanie → `/dashboard`

2. **Istniejący użytkownik:**
   - Odwiedza `/` → przekierowanie do `/login`
   - Loguje się → `/dashboard`

3. **Zalogowany użytkownik:**
   - Próba wejścia na `/login` lub `/register` → przekierowanie do `/dashboard`
   - Wylogowanie → przekierowanie do `/login`

## 🛠️ Technologie

- React 19
- TypeScript
- React Router DOM 7
- React Hook Form 7
- Axios
- Tailwind CSS 4
- Vite 7

## 📦 Struktura projektu

```
frontend/
├── src/
│   ├── app/
│   │   └── router/
│   │       └── index.tsx          # Routing configuration
│   ├── components/
│   │   ├── ProtectedRoute.tsx     # Protected route wrapper
│   │   └── PublicRoute.tsx        # Public route wrapper
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx          # Login page
│   │   │   └── Register.tsx       # Register page
│   │   └── home/
│   │       └── App.tsx            # Dashboard
│   ├── services/
│   │   └── auth.service.ts        # Auth API service
│   ├── main.tsx                   # App entry point
│   └── vite-env.d.ts              # TypeScript definitions
├── .env                           # Environment variables
└── .env.example                   # Example env file
```

## ✨ Następne kroki

Po pomyślnym uruchomieniu możesz:
1. Dostosować kolory i style do swoich preferencji
2. Dodać więcej pól do formularza rejestracji (wiek, cel treningowy, etc.)
3. Zaimplementować resetowanie hasła
4. Dodać OAuth (Google, Facebook)
5. Rozbudować dashboard o funkcjonalności treningowe
