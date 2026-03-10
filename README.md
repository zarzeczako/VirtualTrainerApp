# 💪 WirtualnyTrener - Advanced Workout Plan Generator

> **AI-Powered Intelligent Workout Planning System**  
> Enterprise-grade TypeScript/NestJS backend with sophisticated plan generation, quantile-based difficulty stratification, weighted similarity algorithms, and real-time adaptive training optimization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red?logo=nestjs)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-13AA52?logo=mongodb)](https://www.mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 What is WirtualnyTrener?

A production-ready, intelligent fitness platform that **generates personalized, scientifically-balanced workout plans** using machine learning-inspired algorithms and domain-specific heuristics.

### ✨ Key Innovations

🎯 **Quantile Distribution Analysis** – Stratifies 1300+ exercises by difficulty quantiles (0–10 scale) for precision targeting by user level (Beginner → Advanced)

⚙️ **Weighted Cosine Similarity Engine** – Computes exercise substitutions across bodyPart/target/equipment using normalized feature vectors with learned weights (0.4/0.4/0.2)

🔄 **Push/Pull Rebalancing Algorithm** – Maintains optimal muscle group balance (0.7–1.43 ratio) via iterative constraint-satisfaction up to 3 swap attempts

📊 **Role-Based Difficulty Scoring** – Combines base difficulty (`0–10`) + role bonuses (`MAIN_T1: +10`, `MAIN_T2: +5`, `ACCESSORY: +2`) for intelligent exercise ordering

🧠 **Adaptive Plan Refinement** – AI reviewer (post-generator) validates plans against volume metrics, variety scores, and movement balance with auto-correction

🏆 **Golden List Curation** – Hand-picked, quality-controlled exercise registry that grows organically through Smart Swap promotions

---

## 🏗️ Architecture

```
Client Layer (React 18 + Vite + TypeScript)
    ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────┐
│             NestJS Application Server                    │
├─────────────────────────────────────────────────────────┤
│ Auth Module (JWT + OAuth)     Workout Plans (Generator)  │
│ • Passport strategies         • Plan generation engine   │
│ • Google/Facebook OAuth       • AI refinement engine     │
│ • JWT refresh tokens          • Plan API endpoints       │
│                               • Smart Swap logic         │
├──────────────────────────────────────────────────────────┤
│ Recommendations Engine        Chat & Progress            │
│ • Cosine similarity compute   • Dialogflow integration   │
│ • Exercise substitutions      • User progress tracking   │
│ • Diversity optimization      • Workout logging          │
├─────────────────────────────────────────────────────────┤
│ Exercises Management          Database Models            │
│ • Golden List (curated)       • Mongoose schemas         │
│ • Swap Library (1300+)        • Indexing strategies      │
│ • Exercise seeders            • Relationship mapping     │
└─────────────────┬───────────────────────────────────────┘
                  │ Mongoose/MongoDB Driver
        ┌─────────▼────────────┐
        │ MongoDB Atlas/Local   │
        │ Collections:          │
        │ • exercises           │
        │ • swap_exercises      │
        │ • workout_plans       │
        │ • users               │
        │ • progress_sessions   │
        └──────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ (LTS)
- MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

```bash
# Clone and configure
git clone https://github.com/yourusername/WirtualnyTrener.git
cd WirtualnyTrener

# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Update .env files with your credentials:
# - MONGODB_URI (MongoDB Atlas connection string)
# - JWT_SECRET (min 32 chars)
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (for OAuth)

# Start all services
docker-compose up -d

# Backend:  http://localhost:3000
# Frontend: http://localhost:5173
```

### Option 2: Local Development

#### Backend
```bash
cd backend
npm install
npm run seed:exercises      # Load Golden List
npm run seed:swaps          # Load exercise library
npm run start:dev           # Start on http://localhost:3000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev                 # Start on http://localhost:5173
```

#### Testing
```bash
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:integration  # Integration tests
```

---

## 🔬 Technical Deep Dive

### 1. Plan Generation Algorithm

The generator uses a **6-step pipeline** to produce scientifically balanced plans:

#### Step 1: Exercise Filtering
```typescript
// Build MongoDB query:
filter = {
  // Exclude non-strength exercises
  category: { $nin: ['cardio', 'stretching', 'mobility'] },
  
  // Match user equipment level
  equipment: equipmentFilter(userPreset),
  
  // Quantile-based difficulty for user level
  difficulty: {
    $gte: quantile(userLevel, 0.25),
    $lte: quantile(userLevel, 0.75)
  }
}

exercises = db.exercises.find(filter)
```

**Quantile Distribution Example:**
```
User Level: INTERMEDIATE
Difficulties: [2,3,4,5,5,6,6,7,8,9]

Q1 (25th): 4    [only ~25% easiest]
Q2 (50th): 5.5  
Q3 (75th): 7    [only ~25% hardest]

Filter: difficulty ∈ [4–7] → 8/10 exercises
```

#### Step 2: Exercise Categorization
```typescript
// Organize by ROLE and PATTERN
by_role = {
  MAIN_T1: [...],        // Heavy compound lifts
  MAIN_T2: [...],        // Secondary compounds
  ACCESSORY: [...],      // Hypertrophy/pump
  ISOLATION: [...],      // Single-joint movements
  CORE: [...]            // Spinal stability
}

by_pattern = {
  PUSH_H: [...],         // Horizontal pressing (bench)
  PUSH_V: [...],         // Vertical pressing (overhead)
  PULL_H: [...],         // Horizontal pulling (rows)
  PULL_V: [...],         // Vertical pulling (pull-ups)
  QUAD: [...],           // Quad emphasis
  HINGE: [...],          // Hip hinge/posterior chain
  // ...
}
```

#### Step 3: Training Split Selection
```typescript
switch (daysPerWeek) {
  case 2:
  case 3:
    strategy = "Full Body Workout (FBW)"
    // Rotate QUAD/HINGE + PUSH/PULL across days
    break
    
  case 4:
    strategy = "Upper/Lower Split"
    // Days 1-2: Upper (Push + Pull)
    // Days 3-4: Lower (Quad + Hinge)
    break
    
  case 5:
    strategy = "Push/Pull/Legs + Upper/Lower Volume"
    // Day 1: Push (horizontal + vertical)
    // Day 2: Pull (horizontal + vertical)
    // Day 3: Legs (compound quad + hinge)
    // Day 4: Upper Volume (arms, shoulders, back)
    // Day 5: Lower Volume (quads, glutes, calves)
    break
}
```

#### Step 4: Exercise Selection with Diversity Optimization
```typescript
for (let day of trainingDays) {
  // 1. Select MAIN_T1 (primary compound)
  candidates = exercises_by_role('MAIN_T1')
  selected = max_diverse_candidate(candidates, already_selected)
  day.exercises.push(selected)
  
  // 2. Select MAIN_T2 (secondary compound)
  candidates = exercises_by_role('MAIN_T2')
  selected = max_diverse_candidate(candidates, already_selected)
  day.exercises.push(selected)
  
  // 3. Select ACCESSORIES (3-4 exercises)
  for (let i = 0; i < 3; i++) {
    candidates = exercises_by_role('ACCESSORY')
    selected = max_diverse_candidate(candidates, already_selected)
    day.exercises.push(selected)
  }
  
  // 4. Optional: Add ISOLATION (1-2 exercises)
  // 5. Optional: Add CORE (1 exercise)
}

// Diversity function: return exercise with LOWEST maximum similarity
function max_diverse_candidate(pool, selected) {
  return pool.reduce((best, candidate) => {
    let max_sim = Math.max(...selected.map(ex => 
      cosine_similarity(candidate, ex)
    ))
    
    return (max_sim < best.max_sim) ? 
      {exercise: candidate, max_sim} : best
  })
}
```

**Cosine Similarity (Weighted):**
```typescript
// One-hot encoded feature vectors:
ex1 = {
  bodyPart: [0,1,0,...],     // "Chest" at index 1
  target: [1,0,0,...],       // "Pectoralis" at index 0
  equipment: [1,0,0,...]     // "Barbell" at index 0
}

ex2 = {
  bodyPart: [1,0,0,...],     // "Back"
  target: [0,1,0,...],       // "Latissimus"
  equipment: [1,0,0,...]     // "Barbell"
}

// Weighted similarity:
similarity(ex1, ex2) = 
  (dot(ex1.bodyPart, ex2.bodyPart) × 0.4 +
   dot(ex1.target, ex2.target) × 0.4 +
   dot(ex1.equipment, ex2.equipment) × 0.2) / normalization

= (0 × 0.4 + 0 × 0.4 + 1 × 0.2) / norm ≈ 0.18
```

#### Step 5: Set/Rep Prescription
```typescript
// Depends on goal + user level
const prescription = {
  Strength: {
    sets: 8,
    reps: 3,
    rest_seconds: 180
  },
  Hypertrophy: {
    sets: 3,
    reps: 8,
    rest_seconds: 120
  },
  Calisthenics: {
    sets: 4,
    reps: 6,
    rest_seconds: 90
  },
  Endurance: {
    sets: 3,
    reps: 15,
    rest_seconds: 60
  }
}
```

#### Step 6: Pass to AI Refinement Engine
(See section below)

---

### 2. AI Refinement Engine

**Input:** Raw generated plan  
**Output:** Validated, rebalanced plan with metrics

```typescript
async refine(plan: WorkoutPlan): Promise<WorkoutPlan> {
  // 1. Calculate plan-wide metrics
  const metrics = this.calculateMetrics(plan)
  plan.refinementMetrics = metrics
  
  // 2. Check Push/Pull balance
  if (metrics.pushPullRatio < 0.7 || metrics.pushPullRatio > 1.43) {
    await this.attemptRebalance(plan, metrics)
  }
  
  // 3. Sort exercises by difficulty within each day
  plan.weeklyPlan = plan.weeklyPlan.map(day => ({
    ...day,
    exercises: this.sortByEstimatedDifficulty(day.exercises)
  }))
  
  return plan
}

// Push/Pull Ratio Calculation
calculatePushPullRatio(plan: WorkoutPlan): number {
  let pushVolume = 0, pullVolume = 0
  
  plan.weeklyPlan.forEach(day => {
    day.exercises.forEach(ex => {
      const volume = ex.sets * ex.reps
      
      if (ex.pattern.includes('PUSH')) pushVolume += volume
      if (ex.pattern.includes('PULL')) pullVolume += volume
    })
  })
  
  return pushVolume / pullVolume  // Target: [0.7, 1.43]
}

// Auto-Rebalancing (up to 3 attempts)
async attemptRebalance(plan, metrics): Promise<boolean> {
  let attempts = 0
  const MAX_ATTEMPTS = 3
  
  while (attempts < MAX_ATTEMPTS && 
         (metrics.pushPullRatio < 0.7 || metrics.pushPullRatio > 1.43)) {
    
    // Identify excess category
    const excess = metrics.pushPullRatio > 1.43 ? 'PUSH' : 'PULL'
    const deficit = excess === 'PUSH' ? 'PULL' : 'PUSH'
    
    // Find highest-priority exercise in excess category
    const candidate = this.findCandidateForSwap(plan, excess)
    
    // Find similar alternative in deficit category
    const replacement = await this.findReplacementExercise(
      candidate, 
      deficit,
      plan
    )
    
    if (replacement) {
      this.swapExercise(plan, candidate, replacement)
      metrics = this.calculateMetrics(plan)
      attempts++
    } else {
      break  // Can't find suitable replacement
    }
  }
  
  return attempts > 0
}

// Estimated Difficulty = Base + Role Bonus
estimatedDifficulty(exercise): number {
  const baseRoleBonuses = {
    'MAIN_T1': 10,
    'MAIN_T2': 5,
    'ACCESSORY': 2,
    'ISOLATION': 0,
    'CORE': 0
  }
  
  return exercise.difficulty + baseRoleBonuses[exercise.role]
}
```

---

### 3. Smart Swap (Intelligent Exercise Substitution)

Real-time algorithm for suggesting exercise alternatives:

```typescript
async smartSwap(
  planId: string,
  dayIndex: number,
  exerciseId: string
): Promise<WorkoutPlan> {
  
  // 1. Find target exercise
  const targetExercise = await this.findExercise(exerciseId)
  
  // 2. Compute 20 most similar exercises
  const candidates = await this.recommendationService.findSimilar(
    targetExercise,
    limit: 20
  )
  
  // 3. Filter duplicates (already in training day)
  const dayExercises = plan.weeklyPlan[dayIndex].exercises
  const filtered = candidates.filter(ex =>
    !dayExercises.some(d => d.apiId === ex.apiId)
  )
  
  // 4. Prefer Golden List exercises
  const ranked = filtered.sort((a, b) => {
    const aInGolden = this.isInGoldenList(a)
    const bInGolden = this.isInGoldenList(b)
    return bInGolden - aInGolden
  })
  
  // 5. Select top match
  const replacement = ranked[0]
  
  // 6. If not in Golden List → promote it
  if (!this.isInGoldenList(replacement)) {
    await this.exerciseService.promoteFromSwapLibrary(replacement)
  }
  
  // 7. Update plan
  plan.weeklyPlan[dayIndex].exercises[
    exerciseIndex
  ] = {
    apiId: replacement.apiId,
    name: replacement.name,
    name_pl: replacement.name_pl,
    sets: oldExercise.sets,
    reps: oldExercise.reps
  }
  
  return plan.save()
}
```

---

### 4. Golden List & Exercise Curation

**Structure:**
```typescript
interface Exercise {
  apiId: string                    // Unique ID
  name: string                     // English name
  name_pl: string                  // Polish name
  bodyPart: string                 // e.g., "chest", "back"
  target: string                   // e.g., "pectoralis", "latissimus"
  equipment: string                // e.g., "barbell", "dumbbell", "body-weight"
  difficulty: number               // 0-10 scale
  role: 'MAIN_T1'|'MAIN_T2'|...   // Exercise role
  pattern: string                  // e.g., "PUSH_H", "PULL_V"
  is_unilateral: boolean          // True if single-limb
  instructions: string             // Polish instructions
  createdAt: Date
  sourceLibrary: 'golden_list'|'swap_promotion'
}
```

**Selection Priority:**
1. **Golden List** (1st choice) – curated, quality-vetted
2. **Promoted from Swaps** – proven popular via Smart Swap usage
3. **Swap Library** (fallback) – unvetted, large pool (1300+)

---

## 📡 API Endpoints

### Authentication
```
POST   /auth/register                    Email + password signup
POST   /auth/login                       Email + password login  
POST   /auth/google                      Google OAuth callback
GET    /auth/profile                     Current user profile
POST   /auth/refresh                     Refresh JWT token
```

### Workout Plans
```
POST   /workout-plans/generate           Generate new plan
GET    /workout-plans                    List user's plans (paginated)
GET    /workout-plans/:id                Get plan with full details
DELETE /workout-plans/:id                Delete plan
POST   /workout-plans/:id/clone          Duplicate existing plan

POST   /workout-plans/:id/swap-exercise  Smart Swap one exercise
PUT    /workout-plans/:id/save-progress  Log completed session
```

### Exercises
```
GET    /exercises                        List all exercises (Golden List)
GET    /exercises/search?q=:query        Search by name/pattern
GET    /exercises/by-pattern/:pattern    Filter by movement pattern
POST   /exercises                        Create new (admin)
PUT    /exercises/:id                    Update (admin)
```

### Recommendations
```
GET    /recommendations/similar/:id      Find 20 similar exercises
GET    /recommendations/by-pattern/:p    Exercises matching pattern
```

### Progress
```
POST   /progress/log-session             Save completed workout
GET    /progress/history                 User's workout history
GET    /progress/stats                   Aggregate statistics
```

---

## 🗂️ Project Structure

```
WirtualnyTrener/
├── backend/
│   ├── src/
│   │   ├── auth/                          # Authentication
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── google.strategy.ts
│   │   │   └── dto/
│   │   ├── workout-plans/                 # Core domain logic
│   │   │   ├── plan-generator.service.ts  # 6-step algorithm
│   │   │   ├── plan-refinement/
│   │   │   │   └── plan-refinement.service.ts  # AI review
│   │   │   ├── workout-plans.controller.ts
│   │   │   ├── workout-plans.service.ts
│   │   │   ├── schemas/
│   │   │   │   ├── workout-plan.schema.ts
│   │   │   │   └── plan-exercise.schema.ts
│   │   │   └── dto/
│   │   ├── exercises/                     # Exercise management
│   │   │   ├── exercises.controller.ts
│   │   │   ├── exercises.service.ts
│   │   │   ├── seeder.service.ts          # Golden List seeder
│   │   │   ├── swap-seeder.service.ts     # Swap lib seeder
│   │   │   ├── schemas/
│   │   │   │   ├── exercise.schema.ts
│   │   │   │   └── swap-exercise.schema.ts
│   │   │   └── dto/
│   │   ├── recommendations/               # ML-inspired similarities  
│   │   │   └── recommendations.service.ts
│   │   ├── chat/                          # Dialogflow integration
│   │   ├── progress/                      # User tracking
│   │   ├── users/                         # User management
│   │   ├── common/                        # Guards, pipes, utilities
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── data/
│   │   ├── exercises.json                 # Raw exercise library
│   │   ├── golden_list_final.json         # Curated Golden List
│   │   └── dialogflow/
│   ├── test/
│   │   ├── unit/                          # Unit tests
│   │   ├── integration/                   # Integration tests
│   │   └── e2e/                           # End-to-end tests
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/                      # API client
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## ⚙️ Configuration

### Backend `.env.example`
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/wirtualnytrener?retryWrites=true&w=majority
MONGODB_TEST_URI=mongodb://localhost:27017/wirtualnytrener-test

# JWT
JWT_SECRET=your-min-32-char-secret-key-for-jwt-signing
JWT_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=xxx-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Dialogflow AI
GOOGLE_DIALOGFLOW_KEY_FILE=./google-credentials-dialogflow.json
DIALOGFLOW_PROJECT_ID=your-project-id

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env.example`
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_ENV=development
```

### Docker Compose Override (optional)
Create `docker-compose.override.yml` for local MongoDB:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    container_name: wirtualnytrener-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: wirtualnytrener
```

---

## 🚀 Deployment

### Docker
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Kubernetes
```bash
# Update secrets
kubectl create secret generic wirtualnytrener-secrets \
  --from-literal=jwt-secret=xxx \
  --from-literal=mongodb-uri=xxx

# Deploy
kubectl apply -f k8s/
```

### Cloud Platforms

**Azure App Service:**
```bash
az appservice plan create -n VirtualnyTrenerPlan -g MyResourceGroup
az webapp create -g MyResourceGroup -p VirtualnyTrenerPlan -n backend-app
```

**AWS Elastic Beanstalk:**
```bash
eb init -p "Node.js 18 running on 64bit Amazon Linux 2"
eb create virtualnytrener-backend
```

**Google Cloud Run:**
```bash
gcloud run deploy backend \
  --source . \
  --platform managed \
  --region us-central1
```

---

## 🧪 Testing

```bash
cd backend

# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov

# Watch mode
npm run test:watch
```

**Target Coverage:**
- Plan Generator: 85%+
- AI Refinement: 80%+
- Recommendations: 90%+
- Controllers: 75%+

---

## 🛣️ Roadmap

### ✅ Phase 1 (Current)
- Quantile-based difficulty stratification
- Push/Pull ratio balancing
- Smart Swap similarity engine
- Golden List curation

### ⏳ Phase 2 (Q2 2026)
- **Weighted Regression Learning** – Deep learning on user feedback
- **Progressive Overload Tracking** – AI predicts next week's load
- **Advanced Metrics** – RIR, RPE, Volume landmarks
- **Real-time Availability** – Equipment detection & substitution

### 🔮 Phase 3 (Q3-Q4 2026)
- Multi-week periodization (macrocycles)
- LSTM/Transformer personalization
- Wearable integration (HR zones, sleep)
- Nutrition planning sync
- iOS/Android apps (React Native)

---

## 📦 Data Source Notice

**Important:** This repository uses proprietary exercise data:

- **`golden_list_final.json`** ✅ – Our curated, hand-picked exercise collection (included)
- **`exercises.json`** ❌ – External API source data (NOT included, intentionally excluded)

If you need the full exercise library, you should:
1. Integrate with your own exercise API (e.g., RapidAPI's "Exercises" API)
2. Create your own exercise database
3. Use our `golden_list_final.json` as a foundation

This ensures we respect intellectual property rights and licensing agreements.

---

## 🤝 Contributing

Contributions welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Write tests (maintain 80%+ coverage)
4. Commit: `git commit -m 'Add: feature description'`
5. Push: `git push origin feature/your-feature`
6. Open Pull Request

**Code Standards:**
- ESLint + Prettier (configured)
- TypeScript strict mode
- Unit tests required
- Update README for new endpoints

---

## 📝 License

MIT License – see [LICENSE](LICENSE) for details.

---

## 👨‍💼 Authors

**Michał** – Backend  
- GitHub: [@zarzeczako](https://github.com/zarzeczako)
- Email: michalzar7@gmail.com

---

## 📚 References

- [NestJS Documentation](https://docs.nestjs.com)
- [React Documentation](https://react.dev)
- [MongoDB Mongoose](https://mongoosejs.com)
- [Vite Guide](https://vitejs.dev)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

**Made with ❤️ for fitness tech enthusiasts and software engineers.**
