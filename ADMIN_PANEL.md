# Panel Administratora - Wirtualny Trener

## Przegląd

Panel administratora to nowoczesny, responsywny interfejs zarządzania aplikacją Wirtualny Trener. Umożliwia pełną kontrolę nad użytkownikami, ćwiczeniami i statystykami systemu.

## Dostęp do panelu

### URL
```
http://localhost:5173/admin
```

### Wymagania
- Konto użytkownika z rolą `admin`
- Aktywny token JWT

## Utworzenie pierwszego administratora

### Sposób 1: Bezpośrednio w MongoDB

Połącz się z bazą danych i zaktualizuj użytkownika:

```javascript
db.users.updateOne(
  { email: "twoj@email.com" },
  { 
    $set: { 
      role: "admin",
      isBlocked: false 
    } 
  }
)
```

### Sposób 2: Przez MongoDB Compass

1. Otwórz MongoDB Compass
2. Podłącz się do bazy danych
3. Znajdź kolekcję `users`
4. Znajdź użytkownika po email
5. Edytuj dokument i dodaj/zmień:
   - `role: "admin"`
   - `isBlocked: false`
6. Zapisz zmiany

### Sposób 3: Skrypt seedera (opcjonalnie)

Możesz stworzyć skrypt seeder w backendzie:

```typescript
// backend/src/users/admin-seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schema/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeeder {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async createAdmin() {
    const adminEmail = 'admin@wirtualnytrener.pl';
    const existing = await this.userModel.findOne({ email: adminEmail });
    
    if (existing) {
      console.log('Admin już istnieje');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    await this.userModel.create({
      email: adminEmail,
      name: 'Administrator',
      password: hashedPassword,
      role: 'admin',
      isBlocked: false,
    });

    console.log('Utworzono administratora:');
    console.log('Email: admin@wirtualnytrener.pl');
    console.log('Hasło: Admin123!');
    console.log('WAŻNE: Zmień hasło po pierwszym logowaniu!');
  }
}
```

## Funkcje panelu

### 1. Dashboard (Statystyki)

**Ścieżka:** `/admin`

**Funkcje:**
- Przegląd ogólny systemu (liczba użytkowników, planów, ćwiczeń)
- Statystyki aktywności (użytkownicy aktywni, zablokowani)
- Trendy tygodniowe (nowe plany, zapytania AI)
- Ostatnia aktywność (nowe konta, nowe plany)
- Szybkie akcje (linki do zarządzania)

**Wyświetlane metryki:**
- Wszyscy użytkownicy
- Aktywni użytkownicy  
- Zablokowani użytkownicy
- Plany treningowe (total)
- Ćwiczenia w bazie
- Plany utworzone w tym tygodniu

### 2. Zarządzanie użytkownikami

**Ścieżka:** `/admin/users`

**Funkcje:**
- Lista wszystkich użytkowników z paginacją
- Wyszukiwanie po email/nazwie
- Filtrowanie po roli (user/admin)
- Filtrowanie po statusie (aktywny/zablokowany)
- Edycja danych użytkownika (email, nazwa, rola)
- Blokowanie/odblokowanie kont
- Usuwanie kont użytkowników

**Ograniczenia:**
- Nie można usunąć konta administratora
- Nie można zablokować konta administratora
- Zablokowany użytkownik nie może się zalogować

**Akcje:**
- **Edytuj** - zmiana email, nazwy lub roli
- **Zablokuj/Odblokuj** - przełącza status `isBlocked`
- **Usuń** - permanentne usunięcie konta (tylko dla `role: user`)

### 3. Zarządzanie ćwiczeniami

**Ścieżka:** `/admin/exercises`

**Status:** W przygotowaniu

**Planowane funkcje:**
- Lista wszystkich ćwiczeń
- Dodawanie nowych ćwiczeń
- Edycja istniejących ćwiczeń
- Usuwanie ćwiczeń
- Zarządzanie kategoriami i tagami

### 4. Ustawienia systemu

**Ścieżka:** `/admin/settings`

**Status:** W przygotowaniu

**Planowane funkcje:**
- Konfiguracja Dialogflow (intencje, konteksty)
- Ustawienia SMTP (email)
- Konfiguracja OAuth (Google)
- Parametry generowania planów
- Zarządzanie motywami (themes)

## Architektura techniczna

### Backend

**Pliki:**
- `backend/src/users/schema/user.schema.ts` - rozszerzony schemat użytkownika
- `backend/src/auth/admin.guard.ts` - guard weryfikujący rolę admin
- `backend/src/users/admin.controller.ts` - REST API endpoints
- `backend/src/users/admin.service.ts` - logika biznesowa
- `backend/src/users/dto/admin.dto.ts` - DTO dla operacji admin

**Endpointy API:**
```
GET    /api/admin/stats                  - statystyki systemu
GET    /api/admin/activity               - ostatnia aktywność
GET    /api/admin/users                  - lista użytkowników (z filtrami)
GET    /api/admin/users/:id              - szczegóły użytkownika
PUT    /api/admin/users/:id              - aktualizacja użytkownika
DELETE /api/admin/users/:id              - usunięcie użytkownika
PUT    /api/admin/users/:id/toggle-block - blokowanie/odblokowanie
```

**Zabezpieczenia:**
- Wszystkie endpointy chronione `@UseGuards(AdminGuard)`
- AdminGuard weryfikuje:
  - Obecność tokenu JWT
  - Poprawność tokenu
  - Istnienie użytkownika
  - Status konta (`isBlocked: false`)
  - Rolę użytkownika (`role: 'admin'`)

### Frontend

**Pliki:**
- `frontend/src/pages/admin/AdminLayout.tsx` - główny layout z nawigacją
- `frontend/src/pages/admin/pages/AdminDashboard.tsx` - strona statystyk
- `frontend/src/pages/admin/pages/AdminUsersPage.tsx` - zarządzanie użytkownikami
- `frontend/src/pages/admin/pages/AdminExercisesPage.tsx` - zarządzanie ćwiczeniami (placeholder)
- `frontend/src/services/admin.service.ts` - komunikacja z API

**Routing:**
```typescript
{
  path: '/admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <AdminDashboard /> },
    { path: 'users', element: <AdminUsersPage /> },
    { path: 'exercises', element: <AdminExercisesPage /> },
    { path: 'settings', element: <AdminSettingsPage /> },
  ],
}
```

**Design:**
- Responsywny layout (mobile-first)
- Sidebar z nawigacją (collapsible na mobile)
- DaisyUI components (theme-aware)
- Lucide React icons
- Tailwind CSS dla stylowania

## Bezpieczeństwo

### Zabezpieczenia implementowane

1. **Weryfikacja roli** - każde żądanie API sprawdza rolę użytkownika
2. **Blokowanie konta** - zablokowany użytkownik nie może się zalogować
3. **Ochrona kont admin** - nie można usunąć ani zablokować konta administratora
4. **JWT tokens** - wszystkie żądania wymagają ważnego tokenu
5. **Walidacja danych** - DTO z class-validator
6. **CORS** - kontrola źródeł żądań

### Najlepsze praktyki

1. **Zmień hasło administratora** po pierwszym logowaniu
2. **Używaj silnych haseł** dla kont admin (min. 12 znaków, mix znaków)
3. **Regularnie sprawdzaj logi** pod kątem podejrzanej aktywności
4. **Nie udostępniaj kont** - każdy administrator powinien mieć własne konto
5. **Backup bazy danych** przed masowymi operacjami (usuwanie użytkowników)
6. **Używaj HTTPS** w produkcji

## Testowanie

### Lokalne testowanie

1. Uruchom backend:
```bash
cd backend
npm run start:dev
```

2. Uruchom frontend:
```bash
cd frontend
npm run dev
```

3. Utwórz konto administratora (patrz: "Utworzenie pierwszego administratora")

4. Zaloguj się na konto administratora

5. Przejdź do `/admin`

### Sprawdzanie uprawnień

Możesz przetestować zabezpieczenia próbując:
- Zalogować się jako zwykły użytkownik i wejść na `/admin` (powinno przekierować do `/dashboard`)
- Wywołać API bez tokenu (powinno zwrócić 401)
- Wywołać API z tokenem użytkownika bez roli admin (powinno zwrócić 403)

## FAQ

**Q: Jak zmienić użytkownika na administratora?**  
A: Edytuj użytkownika w panelu `/admin/users` i zmień rolę na "Administrator"

**Q: Co się stanie jeśli zablokuję użytkownika?**  
A: Użytkownik nie będzie mógł się zalogować. Przy próbie logowania zobaczy komunikat "Twoje konto zostało zablokowane"

**Q: Czy mogę usunąć swoje konto administratora?**  
A: Nie, system uniemożliwia usunięcie konta z rolą admin. To zabezpieczenie przed przypadkowym usunięciem ostatniego administratora.

**Q: Jak przywrócić usunięte konto?**  
A: Usunięcie jest permanentne. Zalecamy blokowanie zamiast usuwania kont.

**Q: Skąd biorą się dane na Dashboard?**  
A: Dashboard pobiera dane w czasie rzeczywistym z MongoDB poprzez endpoint `/api/admin/stats`

## Rozwój i rozbudowa

### Planowane funkcjonalności

- [ ] Zarządzanie ćwiczeniami (CRUD)
- [ ] Historia zmian (audit log)
- [ ] Eksport danych (CSV, JSON)
- [ ] Raporty i wykresy zaawansowane
- [ ] Powiadomienia email dla administratorów
- [ ] Konfiguracja Dialogflow z panelu
- [ ] Bulk operations (masowe operacje na użytkownikach)
- [ ] Role szczegółowe (moderator, super-admin)
- [ ] Zarządzanie treściami (FAQ, regulaminy)
- [ ] Monitoring wydajności (response times, errors)

### Jak dodać nową funkcję

1. **Backend:**
   - Dodaj endpoint w `admin.controller.ts`
   - Zaimplementuj logikę w `admin.service.ts`
   - Dodaj DTO jeśli potrzebne
   - Przetestuj endpoint (Postman/Insomnia)

2. **Frontend:**
   - Dodaj metodę w `admin.service.ts`
   - Stwórz komponent strony w `pages/admin/pages/`
   - Dodaj route w `router/index.tsx`
   - Dodaj link w nawigacji w `AdminLayout.tsx`

## Wsparcie

W przypadku problemów:
1. Sprawdź logi backendu (terminal z `npm run start:dev`)
2. Sprawdź konsolę przeglądarki (DevTools)
3. Zweryfikuj poprawność tokenu JWT
4. Upewnij się że użytkownik ma `role: 'admin'`

## Licencja

Panel administratora jest częścią projektu Wirtualny Trener.
