# 🚀 WirtualnyTrener - Setup & Deployment Guide

Complete installation and configuration instructions for development, testing, and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Setup](#database-setup)
7. [Authentication Configuration](#authentication-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Operating System:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js:** 18.12.0 or higher (use [Node.js LTS](https://nodejs.org/))
- **npm:** 9.0.0 or higher
- **Git:** Latest version for version control
- **MongoDB:** 5.0+ (local installation or Atlas cloud service)
- **Docker & Docker Compose:** (optional, for containerized deployment)

### Verify Installation

```bash
# Check versions
node --version      # Should show 18.x.x or higher
npm --version       # Should show 9.x.x or higher
git --version       # Any recent version
docker --version    # If using Docker
docker-compose --version  # If using Docker Compose
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/WirtualnyTrener.git
cd WirtualnyTrener
```

### 2. Create Environment Files

#### Backend Environment

```bash
cd backend
cp .env.example .env
```

**Edit `backend/.env`** with your configuration:

```bash
# Server
PORT=3000
NODE_ENV=development

# MongoDB Atlas (Recommended)
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/wirtualnytrener?retryWrites=true&w=majority

# OR Local MongoDB
# MONGODB_URI=mongodb://localhost:27017/wirtualnytrener

# JWT (Generate secure random string, min 32 chars)
# Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secure-random-secret-here-min-32-chars
JWT_EXPIRATION=7d

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Dialogflow (Google Cloud)
GOOGLE_DIALOGFLOW_KEY_FILE=./google-credentials-dialogflow.json
DIALOGFLOW_PROJECT_ID=your-project-id

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Frontend
FRONTEND_URL=http://localhost:5173
```

#### Frontend Environment

```bash
cd ../frontend
cp .env.example .env
```

**Edit `frontend/.env`**:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_ENV=development
```

---

## Local Development

### Backend Setup

#### Step 1: Install Dependencies

```bash
cd backend
npm install
```

#### Step 2: Verify MongoDB Connection

Test your MongoDB connection string:

```bash
npm install -g mongodb-client  # Optional

# Test connection (replace with your URI)
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/wirtualnytrener"
```

#### Step 3: Seed Database

Load exercise data into MongoDB:

```bash
# Load swap library (1300+ exercises)
npm run seed:swaps

# Load Golden List (curated exercises)
npm run seed:exercises

# Verify:
npm run db:list-collections
```

#### Step 4: Start Backend Server

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Watch mode for tests
npm run test:watch
```

Backend runs on **http://localhost:3000**

Check health: `curl http://localhost:3000/health`

### Frontend Setup

#### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

#### Step 2: Start Development Server

```bash
# Development mode with Vite hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Frontend runs on **http://localhost:5173**

### Testing

#### Backend Tests

```bash
cd backend

# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov

# Watch mode (re-run on file changes)
npm run test:watch
```

#### Frontend Tests

```bash
cd frontend

# Run Vitest tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

---

## Docker Deployment

### Quick Start (All-in-One)

```bash
# From project root
docker-compose up -d

# Verify services
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Access Services

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs (if Swagger enabled)

### Docker Compose Configuration

The `docker-compose.yml` includes:

1. **Backend Service** – NestJS on port 3000
2. **Frontend Service** – React+Vite on port 5173
3. **MongoDB Service** – Database on port 27017 (if included)

### Rebuild Images

```bash
# Rebuild all services
docker-compose build --no-cache

# Rebuild specific service
docker-compose build backend --no-cache

# Push to registry (if configured)
docker push your-registry/wirtualnytrener-backend:latest
docker push your-registry/wirtualnytrener-frontend:latest
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Container Logs

```bash
# Real-time logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# With timestamps
docker-compose logs -f --timestamps backend
```

---

## Production Deployment

### General Considerations

1. **Environment:** Use production settings in `.env`
2. **Database:** Use MongoDB Atlas (never expose local DB)
3. **Secrets:** Use environment variables or secret management tools
4. **SSL/TLS:** Enable HTTPS in production
5. **CORS:** Restrict to your domain only
6. **Rate Limiting:** Enable to prevent abuse
7. **Monitoring:** Set up logging and error tracking

### Azure App Service Deployment

#### Step 1: Create Resource Group & App Service Plan

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name WirtualnyTrenerRG \
  --location eastus

# Create App Service Plan
az appservice plan create \
  --name WirtualnyTrenerPlan \
  --resource-group WirtualnyTrenerRG \
  --sku B2 \
  --is-linux
```

#### Step 2: Deploy Backend

```bash
# Create web app
az webapp create \
  --resource-group WirtualnyTrenerRG \
  --plan WirtualnyTrenerPlan \
  --name backend-wirtualnytrener \
  --runtime "NODE|18-lts"

# Configure deployment
az webapp config appsettings set \
  --resource-group WirtualnyTrenerRG \
  --name backend-wirtualnytrener \
  --settings \
  NODE_ENV=production \
  MONGODB_URI=$MONGODB_URI \
  JWT_SECRET=$JWT_SECRET

# Deploy from Git
az webapp up \
  --resource-group WirtualnyTrenerRG \
  --name backend-wirtualnytrener \
  --plan WirtualnyTrenerPlan
```

#### Step 3: Deploy Frontend (Static Web App)

```bash
# Create Static Web App
az staticwebapp create \
  --name frontend-wirtualnytrener \
  --resource-group WirtualnyTrenerRG \
  --source https://github.com/yourusername/WirtualnyTrener \
  --branch main \
  --app-location "frontend" \
  --output-location "dist"
```

### AWS Elastic Beanstalk Deployment

#### Step 1: Install EB CLI

```bash
pip install awsebcli

eb init -p "Node.js 18 running on 64bit Amazon Linux 2" \
  --region us-east-1 \
  wirtualnytrener
```

#### Step 2: Create Environment

```bash
# Create development environment
eb create wirtualnytrener-dev --instance-type t3.medium

# Create production environment
eb create wirtualnytrener-prod --instance-type t3.large
```

#### Step 3: Configure Environment Variables

```bash
# Set environment variables
eb setenv NODE_ENV=production \
  MONGODB_URI=$MONGODB_URI \
  JWT_SECRET=$JWT_SECRET

# Apply changes
eb deploy
```

### Google Cloud Run Deployment

#### Step 1: Build Container Image

```bash
# Build backend image
docker build -t gcr.io/YOUR_PROJECT/backend:latest backend/

# Build frontend image
docker build -t gcr.io/YOUR_PROJECT/frontend:latest frontend/

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT/backend:latest
docker push gcr.io/YOUR_PROJECT/frontend:latest
```

#### Step 2: Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy backend \
  --image gcr.io/YOUR_PROJECT/backend:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGODB_URI=$MONGODB_URI,JWT_SECRET=$JWT_SECRET \
  --allow-unauthenticated

# Deploy frontend
gcloud run deploy frontend \
  --image gcr.io/YOUR_PROJECT/frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Database Setup

### Option 1: Local MongoDB

#### Windows

```bash
# Using Chocolatey
choco install mongodb

# Using direct download
# https://www.mongodb.com/try/download/community

# Start service
mongod
```

#### macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community
```

#### Linux (Ubuntu)

```bash
# Install
sudo apt-get update
sudo apt-get install -y mongodb

# Start service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify
mongo --version
```

### Option 2: MongoDB Atlas (Cloud)

#### Step 1: Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Log in
3. Create a new project
4. Click "Build a Cluster"
5. Select M0 (free tier)
6. Choose cloud provider and region

#### Step 2: Get Connection String

1. In Cluster view, click "Connect"
2. Select "Connect Your Application"
3. Copy connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/wirtualnytrener?retryWrites=true&w=majority
   ```
4. Replace `USERNAME`, `PASSWORD` with your credentials

#### Step 3: Create Database User

1. In Atlas, go to "Database Access"
2. Click "Add New Database User"
3. Choose "Scram" authentication
4. Set username and password
5. Assign role: "readWriteAnyDatabase"

#### Step 4: Whitelist IP

1. Go to "Network Access"
2. Click "Add IP Address"
3. Add your IP or `0.0.0.0/0` (for development only)

#### Step 5: Test Connection

```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/wirtualnytrener"
```

---

## Authentication Configuration

### Google OAuth Setup

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (name: "WirtualnyTrener")
3. Enable APIs:
   - "Google+ API"
   - "Dialogflow API" (for chat)

#### Step 2: Create OAuth 2.0 Credentials

1. Go to "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/auth/google/callback    (dev)
   https://yourdomain.com/auth/google/callback   (prod)
   ```
5. Copy Client ID and Client Secret to `.env`

#### Step 3: Test Google OAuth

```bash
# Login via Google
curl -X POST http://localhost:3000/auth/google
```

### Dialogflow Integration

#### Step 1: Create Dialogflow Agent

1. Go to [Dialogflow Console](https://dialogflow.cloud.google.com)
2. Create new agent (name: "WirtualnyTrener")
3. Create intents for fitness queries
4. Train with sample data

#### Step 2: Get Service Account Key

1. In Google Cloud Console, go to "Service Accounts"
2. Create new service account (name: "dialogflow-agent")
3. Create JSON key
4. Save as `backend/google-credentials-dialogflow.json`
5. Add to `.gitignore` (don't commit!)

#### Step 3: Configure in .env

```bash
GOOGLE_DIALOGFLOW_KEY_FILE=./google-credentials-dialogflow.json
DIALOGFLOW_PROJECT_ID=your-project-id
```

---

## Troubleshooting

### Backend Issues

#### MongoDB Connection Error

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Solutions:**
```bash
# Check if MongoDB is running
# Windows: mongod should be running
# macOS: brew services list | grep mongodb
# Linux: sudo systemctl status mongodb

# Try local connection first
mongosh

# Check MONGODB_URI in .env
echo $MONGODB_URI
```

#### Port Already in Use

**Problem:** `Error: listen EADDRINUSE :::3000`

**Solutions:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Or change PORT in .env
PORT=3001
```

#### JWT Secret Error

**Problem:** `Error: jwt secret is invalid`

**Solution:**
```bash
# Generate new JWT_SECRET (min 32 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<paste_generated_secret>
```

### Frontend Issues

#### Vite Port Conflict

**Problem:** `Port 5173 is already in use`

**Solutions:**
```bash
# Specify different port
npm run dev -- --port 5174

# Or kill existing process (same as above for port 5173)
```

#### CORS Error

**Problem:** `Cross-Origin Request Blocked`

**Solution:**
```bash
# Update CORS_ALLOWED_ORIGINS in backend .env
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Restart backend
npm run start:dev
```

### Docker Issues

#### Cannot Connect to Docker Daemon

**Problem:** `Cannot connect to the Docker daemon`

**Solution:**
```bash
# Windows
# Restart Docker Desktop application

# Linux
sudo systemctl start docker
sudo usermod -aG docker $USER
```

#### Container Port Conflicts

**Problem:** `Port 3000 is already allocated`

**Solution:**
```bash
# Kill containers
docker-compose down -v

# Restart
docker-compose up -d
```

#### Out of Disk Space

**Problem:** `No space left on device`

**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Check disk space
df -h  # Linux/macOS
dir C:  # Windows

# Remove unused images
docker image prune -a
```

### Database Issues

#### MongoDB Atlas Connection Timeout

**Problem:** `MongoServerSelectionError: connect ETIMEDOUT`

**Solutions:**
1. Check IP whitelist (Network Access in Atlas)
2. Verify username/password in connection string
3. Check network connectivity
4. Try connection from MongoDB Compass:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/wirtualnytrener
   ```

#### Document Size Limit

**Problem:** `Document exceeds maximum size (16MB)`

**Solution:**
- Split large objects into sub-documents
- Archive old data to separate collection
- Implement pagination for large arrays

---

## Performance Optimization

### Database Optimization

```bash
# Create indexes (in MongoDB console)
db.exercises.createIndex({ "equipment": 1 })
db.exercises.createIndex({ "difficulty": 1 })
db.exercises.createIndex({ "role": 1, "pattern": 1 })
db.workout_plans.createIndex({ "userId": 1, "createdAt": -1 })
```

### Backend Optimization

```bash
# Enable compression in main.ts
app.use(compression())

# Configure caching headers
app.use((req, res, next) => {
  if (req.path.includes('api')) {
    res.set('Cache-Control', 'no-cache')
  }
  next()
})

# Enable connection pooling
MONGODB_MAX_POOL_SIZE=100
```

### Frontend Optimization

```bash
# Build optimization
npm run build

# Analyze bundle size
npm install -D webpack-bundle-analyzer
vite-plugin-visualizer
```

---

## Monitoring & Logs

### View Application Logs

```bash
# Docker
docker-compose logs -f --tail=50 backend

# Local development
npm run start:dev  # Logs visible in terminal

# File-based logging
tail -f logs/application.log
```

### Health Check

```bash
# Backend health
curl http://localhost:3000/health

# Frontend
curl http://localhost:5173/
```

---

## Next Steps

1. ✅ Complete environment setup
2. ✅ Run local development servers
3. ✅ Populate database with seeders
4. ✅ Test API endpoints
5. ✅ Create test user account
6. ✅ Deploy to production platform

For more details, see [README.md](README.md)

---

**Need help?** Open an issue on GitHub or refer to the [Troubleshooting](#troubleshooting) section.
