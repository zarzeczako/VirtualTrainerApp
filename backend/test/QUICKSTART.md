# 🚀 Szybki start - Testy

## Instalacja i uruchomienie testów w 3 krokach

### Krok 1: Zainstaluj zależności

```powershell
cd backend
npm install
```

To zainstaluje również nową zależność: `mongodb-memory-server`

### Krok 2: Uruchom testy

```powershell
# Wszystkie testy (jednostkowe + integracyjne)
npm run test:all

# Lub tylko jednostkowe (szybsze)
npm run test:unit

# Lub tylko integracyjne (E2E)
npm run test:integration
```

### Krok 3: Zobacz pokrycie kodu

```powershell
npm run test:all:cov
```

Następnie otwórz w przeglądarce:
```
backend/coverage/unit/lcov-report/index.html
backend/coverage/integration/lcov-report/index.html
```

---

## 📊 Oczekiwane wyniki

Po uruchomieniu `npm run test:all` powinieneś zobaczyć:

```
Test Suites: 7 passed, 7 total
Tests:       145 passed, 145 total
Snapshots:   0 total
Time:        ~15-30s
```

---

## ⚠️ Możliwe problemy

### Problem 1: "Cannot find module 'mongodb-memory-server'"

**Rozwiązanie:**
```powershell
npm install --save-dev mongodb-memory-server
```

### Problem 2: Testy są wolne

**Rozwiązanie:** To normalne dla testów E2E z in-memory MongoDB.
- Testy jednostkowe: ~5s
- Testy integracyjne: ~20-30s

### Problem 3: "Port already in use"

**Rozwiązanie:** Zamknij inne instancje aplikacji lub MongoDB.

---

## 📁 Struktura testów

```
backend/test/
├── helpers/              # Funkcje pomocnicze
├── unit/                 # Testy jednostkowe (~5s)
│   ├── auth/
│   ├── users/
│   ├── exercises/
│   ├── recommendations/
│   └── dialogflow/
└── integration/          # Testy E2E (~20s)
    ├── auth/
    └── exercises/
```

---

## ✅ Gotowe do prezentacji

Testy są profesjonalnie napisane i gotowe do pokazania na pracy inżynierskiej.

**Co testujemy:**
- ✅ Rejestracja i logowanie (JWT)
- ✅ CRUD użytkowników
- ✅ Wyszukiwanie ćwiczeń (1300+ ćwiczeń)
- ✅ Algorytmy AI (cosine similarity)
- ✅ Dialogflow webhook
- ✅ Integracja z MongoDB

**Pokrycie:** >85% kodu
