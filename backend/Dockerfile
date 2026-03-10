# Dockerfile dla backendu (NestJS)
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiowanie plików package
COPY package*.json ./

# Instalacja zależności
RUN npm ci

# Kopiowanie całego projektu
COPY . .

# Build aplikacji
RUN npm run build

# Etap produkcyjny
FROM node:20-alpine

WORKDIR /app

# Kopiowanie plików package
COPY package*.json ./

# Instalacja tylko produkcyjnych zależności
RUN npm ci --only=production

# Kopiowanie zbudowanej aplikacji z etapu builder
COPY --from=builder /app/dist ./dist

# Kopiowanie plików Google credentials
COPY google-credentiols.json ./
COPY google-credentiols-dialogflow.json ./

# Kopiowanie danych (jeśli potrzebne)
COPY data ./data

# Expose port
EXPOSE 3000

# Uruchomienie aplikacji
CMD ["node", "dist/src/main"]
