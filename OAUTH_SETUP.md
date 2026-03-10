# Konfiguracja OAuth2 i Resetowania Hasła

## 📋 Spis treści
1. [Google OAuth](#google-oauth)
2. [Facebook OAuth](#facebook-oauth)
3. [Konfiguracja Email (SMTP)](#konfiguracja-email-smtp)
4. [Testowanie](#testowanie)

---

## 🔵 Google OAuth

### Krok 1: Utwórz projekt w Google Cloud Console

1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt lub wybierz istniejący
3. W menu nawigacji wybierz **APIs & Services** > **Credentials**

### Krok 2: Konfiguracja OAuth consent screen

1. Kliknij **OAuth consent screen** w menu bocznym
2. Wybierz **External** jako User Type
3. Wypełnij wymagane pola:
   - **App name**: Wirtualny Trener
   - **User support email**: Twój email
   - **Developer contact information**: Twój email
4. Zapisz i kontynuuj
5. W sekcji **Scopes** dodaj:
   - `userinfo.email`
   - `userinfo.profile`
6. Zapisz i kontynuuj

### Krok 3: Utwórz OAuth 2.0 Client ID

1. Wróć do **Credentials**
2. Kliknij **Create Credentials** > **OAuth client ID**
3. Wybierz **Web application**
4. Wypełnij:
   - **Name**: Wirtualny Trener Web
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/auth/google/callback
     ```
5. Kliknij **Create**
6. **WAŻNE**: Skopiuj **Client ID** i **Client Secret**

### Krok 4: Dodaj do .env (backend)

Otwórz plik `backend/.env` i zaktualizuj:

```env
GOOGLE_CLIENT_ID=twoj-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=twoj-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 🔷 Facebook OAuth

### Krok 1: Utwórz aplikację Facebook

1. Przejdź do [Facebook Developers](https://developers.facebook.com/)
2. Kliknij **My Apps** > **Create App**
3. Wybierz **Consumer** jako typ aplikacji
4. Wypełnij podstawowe informacje:
   - **App Display Name**: Wirtualny Trener
   - **App Contact Email**: Twój email
5. Kliknij **Create App**

### Krok 2: Dodaj Facebook Login

1. W dashboardzie aplikacji znajdź **Facebook Login** i kliknij **Set Up**
2. Wybierz **Web**
3. W **Site URL** wpisz:
   ```
   http://localhost:5173
   ```
4. Kliknij **Save** i **Continue**

### Krok 3: Konfiguracja OAuth Redirect URIs

1. W menu bocznym wybierz **Facebook Login** > **Settings**
2. W polu **Valid OAuth Redirect URIs** dodaj:
   ```
   http://localhost:3000/auth/facebook/callback
   ```
3. Zapisz zmiany

### Krok 4: Pobierz App ID i App Secret

1. W menu bocznym wybierz **Settings** > **Basic**
2. **WAŻNE**: Skopiuj:
   - **App ID**
   - **App Secret** (kliknij "Show" aby zobaczyć)

### Krok 5: Dodaj do .env (backend)

Otwórz plik `backend/.env` i zaktualizuj:

```env
FACEBOOK_APP_ID=twoj-app-id
FACEBOOK_APP_SECRET=twoj-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
```

---

## 📧 Konfiguracja Email (SMTP)

### Opcja 1: Gmail (Zalecane dla testów)

1. Włącz **2-Step Verification** w swoim koncie Google
2. Przejdź do [App Passwords](https://myaccount.google.com/apppasswords)
3. Wybierz **Mail** i **Other (Custom name)**
4. Wpisz: "Wirtualny Trener"
5. Kliknij **Generate**
6. **WAŻNE**: Skopiuj wygenerowane hasło (16 znaków)

Otwórz plik `backend/.env` i dodaj:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=wygenerowane-haslo-aplikacji
```

### Opcja 2: SendGrid (Produkcja)

1. Załóż konto na [SendGrid](https://sendgrid.com/)
2. Utwórz API Key w **Settings** > **API Keys**
3. Otwórz plik `backend/.env` i dodaj:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=twoj-sendgrid-api-key
```

### Opcja 3: Mailgun

1. Załóż konto na [Mailgun](https://www.mailgun.com/)
2. Zweryfikuj domenę lub użyj sandbox domain
3. Pobierz SMTP credentials z **Sending** > **Domain settings**
4. Otwórz plik `backend/.env` i dodaj:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=twoj-mailgun-user
SMTP_PASS=twoj-mailgun-password
```

---

## 🧪 Testowanie

### 1. Sprawdź konfigurację .env

Upewnij się, że plik `backend/.env` zawiera wszystkie wymagane zmienne:

```env
# Frontend URL
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

# SMTP (opcjonalne dla testów)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### 2. Uruchom aplikację

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Testowanie OAuth

1. Otwórz http://localhost:5173/login
2. Kliknij "Zaloguj się przez Google" lub "Zaloguj się przez Facebook"
3. Postępuj zgodnie z instrukcjami logowania
4. Po pomyślnym zalogowaniu zostaniesz przekierowany do dashboard

### 4. Testowanie resetowania hasła

1. Otwórz http://localhost:5173/login
2. Kliknij "Zapomniałeś hasła?"
3. Wpisz swój email
4. Sprawdź konsole backendu - znajdziesz tam token resetowania
5. Użyj linku: `http://localhost:5173/reset-password?token=WYGENEROWANY_TOKEN`
6. Ustaw nowe hasło

**UWAGA**: W wersji developerskiej token jest wyświetlany w konsoli backendu. W produkcji będzie wysyłany emailem.

---

## 🔒 Bezpieczeństwo - Produkcja

Przed wdrożeniem na produkcję:

1. **Zaktualizuj URLe w .env:**
   ```env
   FRONTEND_URL=https://twoja-domena.com
   GOOGLE_CALLBACK_URL=https://twoja-domena.com/api/auth/google/callback
   FACEBOOK_CALLBACK_URL=https://twoja-domena.com/api/auth/facebook/callback
   ```

2. **Zaktualizuj URLe w Google Cloud Console:**
   - Authorized JavaScript origins: `https://twoja-domena.com`
   - Authorized redirect URIs: `https://twoja-domena.com/api/auth/google/callback`

3. **Zaktualizuj URLe w Facebook App:**
   - Site URL: `https://twoja-domena.com`
   - Valid OAuth Redirect URIs: `https://twoja-domena.com/api/auth/facebook/callback`

4. **Włącz wysyłkę emaili:**
   - Zaimplementuj email service w `backend/src/auth/email.service.ts`
   - Użyj profesjonalnego SMTP (SendGrid, Mailgun, AWS SES)

5. **Przełącz Facebook App w tryb produkcyjny:**
   - W Facebook Developers dashboard przejdź do **Settings** > **Basic**
   - Zmień **App Mode** z "Development" na "Live"

---

## 📝 Notatki

- **OAuth bez emaila**: Obecnie aplikacja wymaga emaila od providera OAuth. Jeśli Facebook nie zwróci emaila, logowanie się nie powiedzie.
- **Reset hasła**: Token jest ważny przez 1 godzinę
- **Linkowanie kont**: Jeśli zaloguje się przez OAuth użytkownik z emailem już istniejącym w bazie, konto zostanie automatycznie połączone
- **Bezpieczeństwo**: Wszystkie hasła są hashowane za pomocą bcrypt

---

## ❓ Rozwiązywanie problemów

### Google OAuth: "redirect_uri_mismatch"
- Sprawdź czy URL w Google Cloud Console dokładnie odpowiada `GOOGLE_CALLBACK_URL` w .env
- Upewnij się, że nie ma trailing slash

### Facebook OAuth: "URL Blocked"
- Sprawdź czy Valid OAuth Redirect URIs w Facebook App Settings jest poprawnie skonfigurowany
- Upewnij się, że aplikacja Facebook jest w trybie Development dla localhost

### Email nie wysyła się
- Sprawdź credentials SMTP w .env
- Dla Gmail upewnij się, że używasz App Password, nie zwykłego hasła
- Sprawdź logi backendu dla szczegółów błędu

### Token OAuth nie działa
- Sprawdź czy `FRONTEND_URL` w backend/.env jest poprawny
- Sprawdź Network tab w DevTools czy redirect zawiera token
- Upewnij się, że sessionStorage jest dostępny w przeglądarce
