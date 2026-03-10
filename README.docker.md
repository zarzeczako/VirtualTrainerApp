# Docker - Instrukcja Uruchomienia

## Wymagania
- Docker Desktop zainstalowany i uruchomiony
- Git (opcjonalnie)

## Konfiguracja

### 1. Przygotowanie pliku .env
```bash
# W głównym katalogu projektu skopiuj plik .env.docker jako .env
cp .env.docker .env
```

### 2. Weryfikacja credentials
Upewnij się, że masz pliki Google credentials w katalogu `backend/`:
- `google-credentiols.json`
- `google-credentiols-dialogflow.json`

### 3. Konfiguracja URL dla funkcji email
W pliku `.env` skonfiguruj `FRONTEND_URL`:
- **Dla localhost:** `FRONTEND_URL=http://localhost:8080`
- **Dla produkcji:** `FRONTEND_URL=https://twoja-domena.com`

⚠️ **Ważne:** URL musi być dostępny z przeglądarki użytkownika (używany w linkach resetowania hasła w emailach).

## Uruchomienie

### Pierwszy start (z buildem)
```bash
docker-compose up --build
```

### Kolejne uruchomienia
```bash
docker-compose up
```

### Uruchomienie w tle (detached mode)
```bash
docker-compose up -d
```

### Zatrzymanie aplikacji
```bash
docker-compose down
```

### Zatrzymanie i usunięcie volumów
```bash
docker-compose down -v
```

## Dostęp do aplikacji
Po uruchomieniu aplikacja będzie dostępna pod adresem:
- **Frontend + Backend:** http://localhost:8080

Nginx automatycznie przekierowuje żądania:
- `/` → Frontend (React)
- `/api` → Backend (NestJS)

## Logi

### Wyświetlenie logów wszystkich kontenerów
```bash
docker-compose logs
```

### Logi konkretnego kontenera
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Logi w trybie follow (na żywo)
```bash
docker-compose logs -f
```

## Praca lokalna (bez Dockera)

Możesz nadal pracować lokalnie bez Dockera:

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Rozwiązywanie problemów

### Problem: Kontenery nie startują
```bash
# Sprawdź logi
docker-compose logs

# Zrestartuj Docker Desktop
# Wyczyść cache Dockera
docker system prune -a
```

### Problem: Port 8080 jest zajęty
Zmień port w pliku `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Zmień na np. "9090:80"
```

### Problem: Błędy podczas buildu
```bash
# Wyczyść cache i przebuduj
docker-compose build --no-cache
docker-compose up
```

### Restart konkretnego kontenera
```bash
docker-compose restart backend
docker-compose restart frontend
```

## Struktura Dockera

### Backend
- Base image: `node:20-alpine`
- Port wewnętrzny: 3000
- Multi-stage build (builder + production)

### Frontend
- Base image: `node:20-alpine` (build), `nginx:alpine` (production)
- Port: 80 (wewnętrzny) → 8080 (zewnętrzny)
- Nginx jako reverse proxy

### Networking
- Oba kontenery w tej samej sieci Docker: `wirtualnytrener-network`
- Backend dostępny jako `backend:3000` z frontendu

## Aktualizacja aplikacji

Po zmianach w kodzie:
```bash
# Przebuduj i uruchom ponownie
docker-compose up --build

# Lub przebuduj tylko konkretny serwis
docker-compose build backend
docker-compose up -d
```

## Zmienne środowiskowe

Wszystkie zmienne środowiskowe są konfigurowane w:
1. Głównym pliku `.env` (dla docker-compose)
2. Lokalne pliki `.env` w `backend/` i `frontend/` (dla lokalnego developmentu)

Wartości z głównego `.env` są przekazywane do kontenerów przez `docker-compose.yml`.
