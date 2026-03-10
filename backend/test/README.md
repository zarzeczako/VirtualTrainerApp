# Testy - Wirtualny Trener Backend

Profesjonalna struktura testów jednostkowych i integracyjnych dla aplikacji Wirtualny Trener.

## 📁 Struktura katalogów

```
backend/test/
├── helpers/                    # Wspólne narzędzia testowe
│   ├── test-utils.ts          # Funkcje pomocnicze (mocki, factory)
│   ├── mock-data.ts           # Testowe dane (users, exercises, plans)
│   └── test-database.ts       # In-memory MongoDB dla testów E2E
│
├── unit/                      # Testy jednostkowe (izolowane)
│   ├── auth/
│   │   └── auth.service.spec.ts
│   ├── users/
│   │   └── users.service.spec.ts
│   ├── exercises/
│   │   └── exercises.service.spec.ts
│   ├── recommendations/
│   │   └── recommendations.service.spec.ts
│   ├── workout-plans/
│   │   ├── workout-plans.service.spec.ts
│   │   └── plan-generator.service.spec.ts
│   └── dialogflow/
│       └── dialogflow.service.spec.ts
│
└── integration/               # Testy integracyjne (E2E)
    ├── auth/
    │   └── auth.e2e-spec.ts
    ├── exercises/
    │   └── exercises.e2e-spec.ts
    └── workout-plans/
        └── workout-plans.e2e-spec.ts
```

## 🚀 Uruchamianie testów

### Wszystkie testy

```bash
# Uruchom wszystkie testy (jednostkowe + integracyjne)
npm run test:all

# Z pokryciem kodu
npm run test:all:cov
```

### Testy jednostkowe

```bash
# Uruchom wszystkie testy jednostkowe
npm run test:unit

# Tryb watch (automatyczne ponowne uruchamianie)
npm run test:unit:watch

# Z pokryciem kodu
npm run test:unit:cov
```

### Testy integracyjne (E2E)

```bash
# Uruchom wszystkie testy integracyjne
npm run test:integration

# Tryb watch
npm run test:integration:watch

# Z pokryciem kodu
npm run test:integration:cov
```

### Debugowanie testów

```bash
# Tryb debug (możliwość podłączenia debuggera)
npm run test:debug
```

## 📊 Pokrycie kodu

Raporty pokrycia kodu są generowane w katalogach:
- `coverage/unit/` - dla testów jednostkowych
- `coverage/integration/` - dla testów integracyjnych

Otwórz `coverage/[type]/lcov-report/index.html` w przeglądarce aby zobaczyć szczegółowy raport.

## 🧪 Co jest testowane?

### Testy jednostkowe (Unit Tests)

#### AuthService (`auth.service.spec.ts`)
- ✅ Rejestracja użytkownika z hashowaniem hasła
- ✅ Logowanie i generowanie JWT token
- ✅ Ustawianie hasła dla istniejącego użytkownika
- ✅ Walidacja i obsługa błędów (duplikat email, nieprawidłowe dane)
- ✅ Bezpieczeństwo (nie ujawnianie informacji o użytkownikach)

#### UsersService (`users.service.spec.ts`)
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Wyszukiwanie użytkowników (po ID, email)
- ✅ Bezpieczne pobieranie danych (bez hasła)
- ✅ Walidacja ObjectId
- ✅ Obsługa edge cases

#### ExercisesService (`exercises.service.spec.ts`)
- ✅ Pobieranie ćwiczeń z Golden List i Swap Library
- ✅ Filtrowanie po części ciała (bodyPart)
- ✅ Wyszukiwanie po nazwie polskiej (case-insensitive)
- ✅ Zaawansowane filtrowanie (MongoDB queries)
- ✅ Tworzenie ćwiczeń ze Swap Library

#### RecommendationsService (`recommendations.service.spec.ts`)
- ✅ Algorytm podobieństwa kosinusowego (AI/ML)
- ✅ Wektoryzacja ćwiczeń (bodyPart, target, equipment)
- ✅ Wyszukiwanie podobnych ćwiczeń
- ✅ Znajdowanie najbardziej zróżnicowanego ćwiczenia
- ✅ Matematyka wektorowa (dot product, magnitude)

### Testy integracyjne (E2E Tests)

#### Auth Endpoints (`auth.e2e-spec.ts`)
- ✅ POST /auth/register - Rejestracja użytkownika
- ✅ POST /auth/login - Logowanie użytkownika
- ✅ Walidacja DTO (email, hasło)
- ✅ JWT token - struktura i payload
- ✅ Bezpieczeństwo (timing attacks, hashowanie)
- ✅ Pełny flow: rejestracja → logowanie → użycie tokena

#### Exercises Endpoints (`exercises.e2e-spec.ts`)
- ✅ GET /exercises - Lista wszystkich ćwiczeń
- ✅ GET /exercises/:id - Szczegóły ćwiczenia
- ✅ GET /exercises/bodyPart/:bodyPart - Filtrowanie
- ✅ GET /exercises/swap - Swap Library
- ✅ Obsługa błędów 404

## 🛠️ Narzędzia i biblioteki

- **Jest** - Framework testowy
- **Supertest** - Testowanie HTTP endpoints
- **@nestjs/testing** - Narzędzia testowe NestJS
- **mongodb-memory-server** - In-memory MongoDB dla testów E2E

## 📝 Konwencje i best practices

### Nazewnictwo testów

```typescript
describe('NazwaKlasy/Endpoint', () => {
  describe('nazwaMetody/endpoint', () => {
    it('powinno [oczekiwane zachowanie]', async () => {
      // Arrange - przygotowanie
      // Act - wykonanie
      // Assert - sprawdzenie
    });
  });
});
```

### Pattern AAA (Arrange-Act-Assert)

```typescript
it('powinno zwrócić użytkownika po ID', async () => {
  // Arrange - przygotuj dane i mocki
  const userId = '123';
  mockUserModel.findById.mockResolvedValue(mockUser);

  // Act - wykonaj testowaną operację
  const result = await service.findOne(userId);

  // Assert - sprawdź wynik
  expect(result).toEqual(mockUser);
  expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
});
```

### Mocki i izolacja

- Testy jednostkowe używają mocków dla wszystkich zależności
- Testy integracyjne używają prawdziwej bazy danych (in-memory)
- Każdy test jest izolowany (beforeEach, afterEach)

### Edge cases

Każdy moduł testuje:
- ✅ Happy path (prawidłowe dane)
- ✅ Błędne dane wejściowe
- ✅ Brakujące dane (null, undefined, empty)
- ✅ Nieprawidłowe typy
- ✅ Graniczne wartości
- ✅ Bezpieczeństwo i walidacja

## 📈 Metryki jakości

### Docelowe pokrycie kodu (Code Coverage)

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

### Przykładowe wyniki

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   85.2  |   78.4   |   84.1  |   86.3  |
 auth/                    |   92.1  |   87.5   |   90.0  |   93.2  |
  auth.service.ts         |   92.1  |   87.5   |   90.0  |   93.2  |
 users/                   |   88.4  |   82.3   |   87.5  |   89.1  |
  users.service.ts        |   88.4  |   82.3   |   87.5  |   89.1  |
 exercises/               |   84.7  |   76.8   |   83.3  |   85.4  |
  exercises.service.ts    |   84.7  |   76.8   |   83.3  |   85.4  |
--------------------------|---------|----------|---------|---------|
```

## 🐛 Troubleshooting

### Problem: "Cannot find module 'mongodb-memory-server'"

```bash
# Zainstaluj brakującą zależność
npm install --save-dev mongodb-memory-server
```

### Problem: Testy E2E są wolne

```bash
# Zwiększ timeout w konfiguracji
# test/jest-integration.config.js
testTimeout: 60000 // 60 sekund
```

### Problem: "Port already in use"

```bash
# Upewnij się że poprzednia instancja została zamknięta
# Lub zmień port w konfiguracji testowej
```

## 👨‍💻 Dla programistów

### Dodawanie nowych testów

1. **Testy jednostkowe**: Stwórz plik `[nazwa].service.spec.ts` w `test/unit/[moduł]/`
2. **Testy integracyjne**: Stwórz plik `[nazwa].e2e-spec.ts` w `test/integration/[moduł]/`
3. Użyj pomocników z `test/helpers/` dla mockowanych danych
4. Uruchom `npm run test:unit` lub `npm run test:integration`

### CI/CD Integration

Dodaj do pipeline'u:

```yaml
# .github/workflows/tests.yml
- name: Run unit tests
  run: npm run test:unit:cov
  
- name: Run integration tests
  run: npm run test:integration:cov
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## 📚 Dokumentacja

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)

## ✅ Checklist przed commitem

- [ ] Wszystkie testy przechodzą (`npm run test:all`)
- [ ] Pokrycie kodu > 80% (`npm run test:all:cov`)
- [ ] Brak console.log w testach
- [ ] Testy są czytelne i dobrze udokumentowane
- [ ] Edge cases są pokryte

---

**Autor:** Michał  
**Data:** 2024-11-18  
**Projekt:** Wirtualny Trener - Praca Inżynierska
