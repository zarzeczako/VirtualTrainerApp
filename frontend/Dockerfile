# Dockerfile dla frontendu (React + Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiowanie plików package
COPY package*.json ./

# Instalacja zależności
RUN npm ci

# Argument dla API URL (musi być przed COPY)
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY

# Kopiowanie całego projektu (bez .env - jest w .dockerignore)
COPY . .

# Build z eksportem zmiennych w subshell
RUN /bin/sh -c "export VITE_API_URL='$VITE_API_URL' && export VITE_GOOGLE_MAPS_API_KEY='$VITE_GOOGLE_MAPS_API_KEY' && echo \"Building with VITE_API_URL=\$VITE_API_URL\" && npm run build"

# Etap produkcyjny z nginx
FROM nginx:alpine

# Usunięcie domyślnej konfiguracji nginx
RUN rm /etc/nginx/conf.d/default.conf

# Kopiowanie własnej konfiguracji nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopiowanie zbudowanej aplikacji z etapu builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Uruchomienie nginx
CMD ["nginx", "-g", "daemon off;"]
