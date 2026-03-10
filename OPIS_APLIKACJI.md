# Wirtualny Trener — szczegółowy opis aplikacji (Backend + Frontend)

**Data opracowania:** 2025-12-21  
**Repozytorium:** `WirtualnyTrener-BackendAndFrontend`

> Ten dokument jest celowo „techniczno-produktowy”: opisuje funkcje aplikacji i jednocześnie pokazuje, **jak dokładnie są zrealizowane w kodzie** (moduły, modele, endpointy, przepływy).  
> Nie zawiera sekretów ani wartości z `.env` — podaję wyłącznie **nazwy zmiennych środowiskowych** i ich rolę.

---

## 1) Cel aplikacji

**Wirtualny Trener** to aplikacja webowa do:
- generowania planów treningowych (V6.x) w oparciu o „Złotą Listę” ćwiczeń,
- wymiany ćwiczeń w planie („Smart Swap”) na podstawie podobieństwa (cosine similarity) i ograniczeń sprzętowych,
- prowadzenia „Atlasu ćwiczeń” (pełna biblioteka 1300+ ćwiczeń),
- monitorowania postępów (waga/BMI + siła poprzez 1RM + prognozy),
- wsparcia użytkownika przez czat/Asystenta (Dialogflow) i webhook (Dialogflow fulfillment),
- administracji użytkownikami oraz bazą ćwiczeń (z rozdzieleniem kolekcji danych).

Aplikacja składa się z dwóch części:
- **Backend**: NestJS + MongoDB (Mongoose), JWT auth, OAuth (Google/Facebook), Dialogflow, SMTP.
- **Frontend**: React + Vite + TypeScript, komunikacja HTTP przez Axios, UI (Tailwind/daisyUI).

---

## 2) Architektura uruchomieniowa (Docker + reverse proxy)

Wersja dockerowa jest oparta o `docker-compose.yml`:
- `backend` (NestJS) wystawiony na `3000:3000`
- `frontend` (Nginx serwujący build Vite) wystawiony na `8080:80`

W `frontend/nginx.conf`:
- frontend serwuje SPA (React Router) poprzez `try_files ... /index.html`.
- wszystko pod `/api` jest reverse-proxy do `backend:3000`:
  - `location /api { proxy_pass http://backend:3000; ... }`

Konsekwencja:
- w przeglądarce korzystasz z: `http://localhost:8080`
- API jest dostępne jako: `http://localhost:8080/api/...` (Nginx przekazuje do kontenera backendu).

### 2.1) Jak frontend buduje URL do API

W `frontend/src/services/http.ts`:
- bazą jest `import.meta.env.VITE_API_URL`.
- helper `withApiPrefix()` **zawsze dopina `/api`**, jeżeli go brakuje.

Docker build dla frontu przekazuje args:
- `VITE_API_URL=http://localhost:8080`

Finalnie `baseURL` w Axios staje się:
- `http://localhost:8080/api`

---

## 3) Backend — podstawy

### 3.1) Prefiks API

W `backend/src/main.ts`:
- ustawiony jest globalny prefiks: `app.setGlobalPrefix('api')`

To oznacza, że endpoint opisany w kontrolerze jako np. `@Controller('auth')` fizycznie działa pod:
- `/api/auth/...`

### 3.2) Moduły w aplikacji

W `backend/src/common/health/app.module.ts` (to jest `AppModule` używany przez `main.ts`):
- `UsersModule`
- `AuthModule`
- `ExercisesModule`
- `WorkoutPlansModule`
- `DialogflowModule`
- `ChatModule`
- `ProgressModule`

### 3.3) Seedery (zasilanie baz danych)

W `backend/src/main.ts` uruchamiane są dwa seedy:
1) `SeederService.seedExercises(false)` — **tylko jeśli kolekcja `exercises` jest pusta**.
2) `AdminSeederService.seedAdmin()` — tworzy konto administratora (jeśli nie istnieje).

Dodatkowo `SwapSeederService` (`backend/src/exercises/swap-seeder.service.ts`) ma `onModuleInit()` i sam seeduje **swap library** (jeśli pusta).

---

## 4) Model danych (MongoDB/Mongoose)

### 4.1) Użytkownik

Model: `backend/src/users/schema/user.schema.ts`

Najważniejsze pola:
- `email` (unikalny)
- `password?` (opcjonalne — użytkownicy OAuth mogą nie mieć hasła)
- `role` (`user` | `admin`)
- `isBlocked` (blokada konta)
- `provider`, `providerId` (OAuth)
- `resetPasswordToken`, `resetPasswordExpires` (reset hasła)
- pola profilu i onboarding (`heightCm`, `weightKg`, `goal`, `experienceLevel`, `themePreference`, `onboardingCompleted` itd.)

### 4.2) Ćwiczenia — DWIE kolekcje i DWIE role

To jest kluczowy element architektury danych:

1) **Golden List (kolekcja `exercises`)**
- model: `backend/src/exercises/schemas/exercise.schema.ts`
- zawiera pola „V6” (`role`, `pattern`, `difficulty`, `isGoldenList`) potrzebne do generowania planu.
- seeder: `backend/src/exercises/seeder.service.ts` ładuje dane z `backend/data/golden_list_final.json`.
- w seederze każde ćwiczenie dostaje `isGoldenList: true`.

2) **Swap Library (kolekcja `swap_exercises`)**
- model: `backend/src/exercises/schemas/swap-exercise.schema.ts` ma jawnie `@Schema({ collection: 'swap_exercises' })`
- zawiera 1300+ ćwiczeń (pełna baza), używana do:
  - Atlasu ćwiczeń
  - Smart Swap (szukanie podobnych ćwiczeń)
  - webhook Dialogflow (instrukcje/definicje)
- seeder: `backend/src/exercises/swap-seeder.service.ts` ładuje z `backend/data/exercises.json`.

### 4.3) Plan treningowy

Model: `backend/src/workout-plans/schemas/workout-plan.schema.ts`

Ważne pola:
- `user` (powiązanie z użytkownikiem)
- `daysPerWeek`, `level`, `goal`, `equipmentPreset`
- `isActive` (jeden plan aktywny na użytkownika)
- `days[]` zawiera `WorkoutDay[]`, a ten ma `PlanExercise[]`.

`PlanExercise` przechowuje snapshot:
- `exercise` (ObjectId do ćwiczenia w kolekcji `exercises` — Golden List)
- `name`, `name_pl`, `sets`, `reps`, `notes?`

### 4.4) Postęp użytkownika

Model: `backend/src/progress/schemas/user-progress.schema.ts`
- 1 dokument na user (unikalny `userId`)
- `weightEntries[]` (waga + data)
- `strengthEntries[]` grupowane po nazwie ćwiczenia i wpisach (waga/reps/data)

---

## 5) Autoryzacja i bezpieczeństwo (JWT + AdminGuard)

### 5.1) JWT

- logowanie: `POST /api/auth/login`
- token jest zwracany jako `{ access_token }`.

Frontend w `frontend/src/services/http.ts`:
- automatycznie dokleja `Authorization: Bearer <token>` jeżeli token jest w `sessionStorage` lub `localStorage`.

### 5.2) Ochrona endpointów admina

- guard: `backend/src/auth/admin.guard.ts`
- zasada:
  - musi być `Authorization: Bearer ...`
  - token musi się zweryfikować
  - user nie może być zablokowany
  - `user.role` musi być `admin`

---

## 6) Auth: rejestracja, logowanie, profil

Kontroler: `backend/src/auth/auth.controller.ts`

Endpointy:
- `POST /api/auth/register` — tworzy usera z hashem bcrypt
- `POST /api/auth/login` — zwraca `{ access_token }`
- `GET /api/auth/profile` — (JwtAuthGuard) zwraca `req.user`

### 6.1) OAuth Google/Facebook

Kontroler:
- `GET /api/auth/google` + callback `GET /api/auth/google/callback`
- `GET /api/auth/facebook` + callback `GET /api/auth/facebook/callback`

Mechanika callback:
- backend generuje token JWT i robi redirect na frontend:
  - `${FRONTEND_URL}/auth/callback?token=...&onboarding=...`

Strategie Passport:
- `backend/src/auth/google.strategy.ts`
- `backend/src/auth/facebook.strategy.ts`

### 6.2) Reset hasła (SMTP)

Endpointy:
- `POST /api/auth/forgot-password` — prosi o reset (odpowiedź zawsze „success-like”, żeby nie ujawniać czy email istnieje)
- `POST /api/auth/reset-password` — ustawia nowe hasło na podstawie tokena

Implementacja:
- token resetu: `crypto.randomBytes(32)`
- w DB trzymany jest hash tokena (bcrypt)
- ważność: 1h (`Date.now() + 3600000`)
- email wysyła `EmailService` (`backend/src/auth/email.service.ts`) przez `nodemailer`.

Uwaga: `EmailService` buduje link resetu jako:
- `${FRONTEND_URL}/reset-password?token=...`

---

## 7) Users: edycja profilu, onboarding, email, hasło

Kontroler: `backend/src/users/users.controller.ts`

Endpointy (JWT):
- `PATCH /api/users/me/profile` — aktualizacja profilu
- `PATCH /api/users/me/complete-onboarding` — domknięcie onboardingu
- `PATCH /api/users/me/email` — zmiana email (wymaga hasła)
- `PATCH /api/users/me/password` — zmiana hasła (wymaga hasła)

W `backend/src/users/users.service.ts`:
- email i hasło są zmieniane tylko po `bcrypt.compare(currentPassword, user.password)`.
- jeśli konto jest OAuth-only i nie ma `password`, endpointy email/password zwracają błąd.

---

## 8) Ćwiczenia: API publiczne (Golden List vs Swap Library)

Kontroler: `backend/src/exercises/exercises.controller.ts`

Endpointy:
- `GET /api/exercises` — lista ćwiczeń z **Golden List** (zwraca podstawowe pola)
- `GET /api/exercises/:id` — szczegóły ćwiczenia z Golden List
- `GET /api/exercises/bodyparts` — unikalne bodyPart (z Golden List)
- `GET /api/exercises/bodypart/:part` — filtr Golden List

Swap Library:
- `GET /api/exercises/swap` — lista z **Swap Library**
- `GET /api/exercises/swap/:id` — szczegóły ćwiczenia ze Swap Library (w tym instrukcje)
- `GET /api/exercises/swap/bodypart/:part` — filtr Swap Library

Serwis: `backend/src/exercises/exercises.service.ts`
- `findAllSwap()` i `findOneSwap()` operują na kolekcji `swap_exercises`.

---

## 9) Generator planu (V6.x) — jak działa

Serwis: `backend/src/workout-plans/plan-generator.service.ts`

Założenie nadrzędne:
- generator **używa tylko Golden List** do układania planu:
  - filtr Mongo zawiera `isGoldenList: true`

### 9.1) Wejście (DTO)

Endpoint: `POST /api/workout-plans/generate` (`backend/src/workout-plans/workout-plans.controller.ts`)

Generator dostaje:
- `daysPerWeek` (2/3/4/5)
- `goal` (`calisthenics`, `strength`, `hypertrophy`, `general`)
- `equipment` (`body-weight`, `free-weight`, `gym` — jako `equipmentPreset`)
- `level` (`beginner`, `intermediate`, `advanced`)
- `name`

### 9.2) Filtr bazowy

`buildBaseFilter(goal, equipmentPreset, level)`:
- mapuje preset sprzętu na listę `equipment` (np. `barbell`, `dumbbell`, `body weight`, `cable` itd.)
- blokuje ćwiczenia „nie-siłowe” przez `NON_STRENGTH_BLOCKLIST` (regex na `name_pl`)
- wymusza obecność pól V6 (`role` istnieje)
- wymusza `isGoldenList: true`
- dla celu `calisthenics` dodatkowo zawęża `difficulty`:
  - beginner: `difficulty <= 4`
  - intermediate: `4 <= difficulty <= 7`
  - advanced: `difficulty >= 7`

### 9.3) Kategoryzacja ćwiczeń

`getAndCategorizeExercisesFromDB(filter)`:
- pobiera ćwiczenia przez `ExercisesService.findExercisesByFilter(filter, 1350)`
- buduje pule:
  - `byRole` (T1/T2/accessory/isolation/core/other)
  - `byPattern` (push/pull/quad/hinge/...)

Generator robi sanity check:
- wymaga co najmniej 1 ćwiczenia w głównych wzorcach (push/pull/legs), inaczej rzuca `BadRequestException`.

### 9.4) Strategie układania dni

W zależności od `daysPerWeek`:
- 2/3 dni: plan FBW (A/B/C)
- 4 dni: Upper/Lower
- 5 dni: PPL + UL (wariant hybrydowy)

Dobór ćwiczeń:
- ćwiczenia główne preferują role `main_t1`, potem `main_t2`, potem `accessory`.
- dobór stara się o różnorodność (metoda `getDiverseExercise(...)`, oparta o `RecommendationService`).

Parametry serii/powtórzeń są dobierane przez `getParamsByLevel(level, goal)`:
- poziom zaawansowania wpływa na ilość serii
- cel `strength` wpływa na zakres powtórzeń (bardziej „siłowe” zakresy)

### 9.5) „Recenzent AI” (post-processing planu)

Po wygenerowaniu dni generator uruchamia:
- `PlanRefinementService.refinePlan(generatedDays)` (`backend/src/workout-plans/plan-refinement/plan-refinement.service.ts`)

Recenzent:
1) populacja ćwiczeń po `_id` (żeby mieć `pattern`, `difficulty`)
2) sortowanie ćwiczeń w dniu wg szacowanej trudności
3) ocena jakości:
   - balans push/pull (docelowy zakres ratio: `0.7–1.43`)
   - objętość (sety/dzień)
   - „różnorodność” (heurystyka podobieństwa bodyPart/target/equipment)
4) próby rebalansu (max 3)
5) depopulacja (plan wraca do trzymania ObjectId ćwiczeń)

### 9.6) Aktywność planu

Generator:
- ustawia wszystkie inne plany usera `isActive: false`
- zapisuje nowy plan z `isActive: true`

---

## 10) Smart Swap — wymiana ćwiczenia w planie

Endpoint: `POST /api/workout-plans/swap-exercise` (`backend/src/workout-plans/workout-plans.controller.ts`)

Logika w `backend/src/workout-plans/workout-plans.service.ts`:
- działa na aktywnym planie użytkownika
- weryfikuje, że ćwiczenie w planie jest spopulowane (musi mieć `apiId`)
- pobiera `equipmentPreset` z planu i mapuje na dozwolony sprzęt
- pobiera podobne ćwiczenia ze Swap Library przez `RecommendationService.getSimilarExercises(apiId, 100)`
- filtruje kandydatów:
  - sprzęt musi pasować do presetu
  - nie wolno zwrócić tego samego ćwiczenia
  - nie wolno zwrócić ćwiczenia już użytego w tym dniu (dedupe po `apiId`)

Wybór docelowego ćwiczenia:
- najpierw próbuje znaleźć ćwiczenie w kolekcji `exercises` po `apiId` (czyli już „znane” w Golden List)
- jeżeli nie ma — robi „promocję”:
  - `ExercisesService.createExerciseFromSwap(...)` tworzy dokument w `exercises` na podstawie danych ze Swap Library.

Na koniec:
- podmienia `PlanExercise.exercise` na `_id` ćwiczenia z `exercises`
- aktualizuje snapshot `name/name_pl`
- zapisuje plan i zwraca spopulowany plan.

---

## 11) RecommendationsService — podobieństwo kosinusowe (AI/ML w praktyce)

Wg dokumentacji testów i implementacji modułu rekomendacji:
- ćwiczenia są wektoryzowane (cechy: m.in. `bodyPart`, `target`, `equipment`)
- podobieństwo liczone jest przez cosine similarity:

$$\cos(\theta)=\frac{A\cdot B}{\lVert A\rVert\,\lVert B\rVert}$$

Ten komponent jest używany m.in. do:
- wspierania różnorodności w generatorze
- znajdowania kandydatów do Smart Swap

---

## 12) Asystent / Chatbot — dwie ścieżki Dialogflow

W projekcie istnieją **dwa sposoby integracji z Dialogflow**, bo rozwiązują różne problemy.

### 12.1) Chat UI: bezpośrednie `detectIntent`

Backend:
- kontroler: `backend/src/chat/chat.controller.ts`
- endpoint: `POST /api/chat`

Serwis:
- `backend/src/chat/chat.service.ts`
- używa `@google-cloud/dialogflow` (`SessionsClient.detectIntent`)
- session:
  - frontend wysyła `sessionId` (dla utrzymania kontekstu rozmowy)
  - backend, jeśli brak `sessionId`, generuje `randomUUID()`

Odpowiedź:
- `{ text, buttons }`
- `buttons` są wyciągane z `fulfillmentMessages[].quickReplies.quickReplies`.

Frontend:
- `frontend/src/pages/home/pages/ChatAssistantPage.tsx`
- trzyma historię rozmowy, pokazuje sugestie i „quick replies” z backendu.

### 12.2) Webhook: fulfillment Dialogflow → backend

Backend:
- kontroler: `backend/src/dialogflow/dialogflow.controller.ts`
- endpoint: `POST /api/dialogflow/webhook`

Serwis:
- `backend/src/dialogflow/dialogflow.service.ts`
- na starcie ładuje wszystkie ćwiczenia z `swap_exercises` do cache i konfiguruje Fuse.js

Obsługiwane intencje:
- `PytanieOTechnike`
- `PytanieOTechnike - Wybor`
- `DefinicjaTerminu`

Mechanika `PytanieOTechnike`:
1) próba exact-match po `name_pl` (case-insensitive)
2) w razie potrzeby wyszukiwanie Fuse.js (fuzzy)
3) filtrowanie po parametrach (muscle_group, equipment) — z mapowaniem PL→EN (translations maps)
4) deduplikacja po `name_pl`
5) odpowiedź:
   - 1 wynik → `fulfillmentText` z listą kroków (`instructions_pl` numerowane)
   - wiele wyników → `fulfillmentMessages` + `quickReplies` (limit 5)

`DefinicjaTerminu`:
- lookup po `definitionsMap` i zwrot `fulfillmentText`.

---

## 13) Postępy (BMI, 1RM, prognozy)

Backend:
- kontroler: `backend/src/progress/progress.controller.ts`
- serwis: `backend/src/progress/progress.service.ts`

### 13.1) Endpointy postępu

Wszystkie endpointy są chronione JWT (`@UseGuards(JwtAuthGuard)`):
- `GET /api/progress/stats`
- `POST /api/progress/add-entry`
- `POST /api/progress/update-weight`
- `POST /api/progress/seed-mock`
- `DELETE /api/progress/history?exerciseName=...`

### 13.2) BMI (waga / wzrost²)

W `ProgressService`:
- historia wagi to `weightEntries[]` (data + kg)
- wzrost brany jest z profilu usera (`heightCm`), a jeśli go brak:
  - fallback: `1.78 m`

BMI liczone jako:

$$BMI=\frac{waga\,[kg]}{wzrost^2\,[m^2]}$$

Zwracane pola w `GET /progress/stats`:
- `currentBMI` (zaokrąglone do 1 miejsca)
- `bmiHistory[]` (data + wartość)

### 13.3) Siła: 1RM (Epley)

Wpis siłowy (`POST /progress/add-entry`) ma:
- `exercise` (nazwa ćwiczenia)
- `weight`
- `reps` (domyślnie 1)
- `date`
- `force?`

Przeliczenie 1RM:
- jeśli `reps == 1` → `1RM = weight`
- w innym przypadku:

$$1RM = waga \cdot (1 + \frac{reps}{30})$$

Walidacja anomalii:
- jeżeli ostatni wpis istnieje i nowy 1RM odchyla się o >20% od poprzedniego,
  - serwis rzuca `ConflictException('Anomaly detected')`, chyba że `force=true`.

### 13.4) Wygładzanie i outliery

Dla wykresów i analizy:
- moving average (okno = 3)
- outliery są usuwane metodą IQR (Q1/Q3, granice 1.5×IQR)

### 13.5) Prognozy siły (1/3/6 miesięcy) + przedziały ufności

Prognozy są liczone przez **ważoną regresję liniową**:
- punkty mają wagę rosnącą kwadratowo: `weight = (index+1)^2`
- horyzonty: 1, 3, 6 miesięcy
- dla każdego punktu prognozy liczone są `lowerBound` i `upperBound`
  - stała `z = 1.96` (przybliżenie 95% CI)

Zwracane w `strengthStats[]`:
- `history[]`
- `movingAverage[]`
- `predictions[1|3|6][]` (z `lowerBound/upperBound`)

### 13.6) Rozkład mięśni na podstawie aktywnego planu

`computeMuscleDistributionFromActivePlan(userId)`:
- bierze plan `isActive: true`
- populates `days.exercises.exercise` (model `Exercise`)
- mapuje `bodyPart` do grup (klatka/plecy/nogi/barki/ręce/core/inne)
- skaluje wynik do 0–100 w oparciu o stałą `IDEAL_VOLUME_PER_GROUP = 12`.

Frontend może to pokazać np. jako radar/porównanie do ideału.

---

## 14) Frontend — kluczowe ekrany i zachowania

### 14.1) Czat / Asystent

`frontend/src/pages/home/pages/ChatAssistantPage.tsx`:
- startuje od wiadomości powitalnej
- trzyma `sessionId` (persist w pamięci komponentu)
- wysyła `text` i `sessionId` do `chatService`
- obsługuje quick replies jako przyciski

### 14.2) Plany (lista + szczegóły)

`frontend/src/pages/home/pages/PlansPage.tsx`:
- pobiera plany przez `workoutPlansService.getAllPlans()`
- pozwala:
  - ustawić aktywny plan
  - usunąć plan
  - przejść do podglądu planu

`frontend/src/pages/home/pages/PlanDetailPage.tsx`:
- pokazuje dni i ćwiczenia
- Smart Swap:
  - triggeruje `workoutPlansService.swapExercise(...)`
  - pokazuje toast oraz inline notice gdy brak zamiennika
- „Info” o ćwiczeniu:
  - jeśli brakuje polskich instrukcji w danych planu, dociąga szczegóły ze Swap Library: `exercisesService.getSwapExerciseById(...)`
- eksport PDF:
  - generuje PDF przez `jspdf` + `jspdf-autotable`
  - dołącza font `Roboto` z `frontend/src/assets/fonts/Roboto-Regular`

### 14.3) Atlas ćwiczeń

`frontend/src/pages/home/pages/ExerciseAtlasPage.tsx`:
- pobiera pełną bazę z `exercisesService.getAllSwapExercises()`
- pobiera listę partii z `exercisesService.getBodyParts()`
- filtrowanie:
  - po partii ciała
  - po custom filtrach (wolne ciężary / siłownia / masa)
  - po wyszukiwaniu

### 14.4) Mapa siłowni

`frontend/src/pages/home/pages/GymsMapPage.tsx`:
- używa Google Maps JS API (`@react-google-maps/api`)
- klucz: `VITE_GOOGLE_MAPS_API_KEY`
- zawiera mechanikę wyszukiwania miejsc (Places API), prompty lokalizacji, paginację wyników, selekcję POI

### 14.5) Panel admina

Ekrany:
- `frontend/src/pages/admin/pages/AdminDashboard.tsx`
- `frontend/src/pages/admin/pages/AdminUsersPage.tsx`
- `frontend/src/pages/admin/pages/AdminExercisesPage.tsx`

Ważne: zarządzanie ćwiczeniami rozdziela źródła danych:
- „Złota Lista” → `/api/admin/exercises?isGoldenList=true`
- „Wszystkie (swap)” → `/api/admin/swap-exercises`

---

## 15) Panel admina — backend

Kontroler: `backend/src/users/admin.controller.ts` (pod `@Controller('admin')`)

Wszystko jest chronione `AdminGuard`.

Endpointy:
- statystyki:
  - `GET /api/admin/stats`
  - `GET /api/admin/activity?limit=...`
- użytkownicy:
  - `GET /api/admin/users?page=&limit=&search=&role=&isBlocked=`
  - `GET /api/admin/users/:id`
  - `PUT /api/admin/users/:id`
  - `DELETE /api/admin/users/:id`
  - `PUT /api/admin/users/:id/toggle-block`
- ćwiczenia:
  - `GET /api/admin/exercises?page=&limit=&search=&isGoldenList=` (kolekcja `exercises`)
  - `GET /api/admin/exercises/:id`
  - `POST /api/admin/exercises`
  - `PUT /api/admin/exercises/:id`
  - `DELETE /api/admin/exercises/:id`
  - `GET /api/admin/swap-exercises?page=&limit=&search=` (kolekcja `swap_exercises`)

Implementacja po stronie serwisu: `backend/src/users/admin.service.ts`

### 15.1) Konto administratora (seed)

`backend/src/users/admin-seeder.service.ts`:
- jeśli admin nie istnieje, tworzy konto administratora.

Uwaga bezpieczeństwa:
- w kodzie są domyślne dane (`admin@gmail.com`, `admin123`).
- w środowisku produkcyjnym należy to zmienić (najlepiej przenieść do `.env`).

---

## 16) Konfiguracja i zmienne środowiskowe (bez wartości)

Poniżej lista najważniejszych zmiennych używanych przez backend/docker:
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `RAPIDAPI_KEY` (wykorzystywane w projekcie, zależnie od funkcji)
- `FRONTEND_URL`

Dialogflow:
- `DIALOGFLOW_PROJECT_ID`
- `DIALOGFLOW_LANGUAGE_CODE` (opcjonalnie)
- `DIALOGFLOW_KEY_FILE` (lub)
- `GOOGLE_APPLICATION_CREDENTIALS` (lub)
- `DIALOGFLOW_CLIENT_EMAIL` + `DIALOGFLOW_PRIVATE_KEY` (alternatywnie)

OAuth:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_CALLBACK_URL`

SMTP:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Frontend:
- `VITE_API_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

Pliki credentiali w backendzie (w dockerze są montowane w obrazie):
- `backend/google-credentiols.json`
- `backend/google-credentiols-dialogflow.json`

---

## 17) Testy — co jest zaimplementowane, a co „do implementacji”

Ten rozdział jest oparty o:
- `backend/test/TEST_SUMMARY.md`
- `backend/test/README.md`
- `backend/test/QUICKSTART.md`
- testy Vitest w frontendzie

### 17.1) Backend (Jest)

Struktura:
- unit: `backend/test/unit/**`
- integration/e2e: `backend/test/integration/**`

Zgodnie z `backend/test/TEST_SUMMARY.md`:

Unit tests (7 plików, ale 2 oznaczone jako „Do implementacji”):
- ✅ `test/unit/auth/auth.service.spec.ts` — 51 testów
- ✅ `test/unit/users/users.service.spec.ts` — 23 testy
- ✅ `test/unit/exercises/exercises.service.spec.ts` — 28 testów
- ✅ `test/unit/recommendations/recommendations.service.spec.ts` — 19 testów
- ✅ `test/unit/dialogflow/dialogflow.service.spec.ts` — 24 testy
- ⚠️ `test/unit/workout-plans/workout-plans.service.spec.ts` — do implementacji
- ⚠️ `test/unit/workout-plans/plan-generator.service.spec.ts` — do implementacji

E2E (3 pliki, 1 „Do implementacji”):
- ✅ `test/integration/auth/auth.e2e-spec.ts` — 15 testów
- ✅ `test/integration/exercises/exercises.e2e-spec.ts` — 6 testów
- ⚠️ `test/integration/workout-plans/workout-plans.e2e-spec.ts` — do implementacji

W `backend/test/QUICKSTART.md` opisany jest oczekiwany wynik:
- `Test Suites: 7 passed, 7 total`
- `Tests: 145 passed, 145 total`

Testy E2E korzystają z:
- `mongodb-memory-server` (in-memory MongoDB)
- `supertest` (testowanie HTTP)

Komendy (wg `backend/test/TEST_SUMMARY.md`):
- `npm run test:all`
- `npm run test:unit` / `npm run test:integration`
- warianty z coverage: `*:cov`

### 17.2) Frontend (Vitest)

W repo istnieją testy komponentów i helperów (Vitest + Testing Library), m.in.:
- `frontend/src/pages/home/pages/PlanDetailPage.test.tsx`:
  - test eksportu PDF (mock jsPDF)
  - test summary planu
  - test Smart Swap (happy path + brak zamiennika)
- `frontend/src/pages/__tests__/ProgressPage.helpers.test.ts`:
  - testy helperów sugestii ćwiczeń (prefiks/infix, normalizacja, odfiltrowanie body weight)

---

## 18) Jak uruchomić (Docker Desktop)

Zgodnie z `docker-compose.yml` oraz `README.docker.md` (jeżeli używasz ich jako źródła prawdy):

```powershell
cd "c:\Users\micha\Desktop\WirtualnyTrener-BackendAndFrontend"
docker-compose up --build
```

Uwaga (Windows/PowerShell): część skryptów `npm` w `backend/package.json` używa `&&`, ale to jest wykonywane przez runner skryptów npm (na Windows typowo przez `cmd.exe`), więc uruchomienie `npm run test:all` działa także z PowerShell.

Po starcie:
- frontend: `http://localhost:8080`
- backend bezpośrednio: `http://localhost:3000`
- API przez reverse proxy: `http://localhost:8080/api/...`

---

## 18.1) Tryb developerski (bez Dockera)

Backend (`backend/`):
```powershell
cd "c:\Users\micha\Desktop\WirtualnyTrener-BackendAndFrontend\backend"
npm install
npm run start:dev
```

Frontend (`frontend/`):
```powershell
cd "c:\Users\micha\Desktop\WirtualnyTrener-BackendAndFrontend\frontend"
npm install
npm run dev
```

W tym trybie musisz mieć skonfigurowane zmienne środowiskowe (sekcja 16) oraz działającą bazę MongoDB (lokalnie lub w kontenerze).

---

## 19) Najważniejsze „dlaczego tak?” (krótka motywacja architektoniczna)

1) **Rozdzielenie Golden List i Swap Library**
- Golden List jest mała i „ręcznie kuratorowana” (role/pattern/difficulty) → idealna do generatora.
- Swap Library jest duża (1300+) → idealna do atlasu i do szukania alternatyw.

2) **Smart Swap z promocją do Golden List**
- plan musi referować ćwiczenia z kolekcji `exercises` (spójny model planu)
- ale kandydat pochodzi ze Swap Library → stąd możliwość utworzenia brakującego ćwiczenia w `exercises`.

3) **Dwie integracje Dialogflow**
- `detectIntent` daje „klasyczny czat” po stronie aplikacji.
- webhook daje precyzyjne fulfillment (np. instrukcje ćwiczeń/definicje) i może być łatwo rozwijany po stronie backendu.
