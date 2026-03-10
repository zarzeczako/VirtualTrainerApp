# 📋 GitHub Preparation Checklist

Complete checklist before pushing `WirtualnyTrener` to GitHub.

## ✅ Security Audit

### 1. Remove Sensitive Files

Before committing, ensure these files are **NOT included**:

```bash
# Check what will be committed
git status

# Remove any tracked secrets
git rm --cached backend/.env
git rm --cached backend/google-credentials*.json
git rm --cached backend/info_o_env.txt
git rm --cached .env
```

### 2. Verify .gitignore

Confirm sensitive patterns are in `.gitignore`:

```bash
# Check current .gitignore
cat .gitignore
cat backend/.gitignore

# Patterns that should be present:
# - .env
# - .env.*.local
# - google-credentials*.json
# - *.json.secret
# - info_o_env.txt
```

### 3. Scan for Secrets

Use tools to detect any accidentally committed secrets:

```bash
# Install git-secrets
brew install git-secrets  # macOS
choco install git-secrets  # Windows
apt-get install git-secrets  # Linux

# Scan repository
git secrets --scan

# Scan history
git secrets --scan-history

# Or use npm package
npm install -g truffleHog
truffleHog filesystem . --json
```

### 4. Last Minute Check

```bash
# List all files that will be committed
git ls-files

# Search for suspicious patterns
git ls-files | xargs grep -l "password\|secret\|token\|key" || echo "Clean!"

# Check for .env files
git ls-files | grep -i ".env" && echo "WARNING: .env file found!" || echo "No .env files"
```

---

## 📂 File Structure Verification

### Required Files Present

```bash
✅ README.md                    # Professional README
✅ SETUP.md                    # Setup instructions
✅ GITHUB_PREP.md             # This file
✅ LICENSE                     # MIT License (create if missing)
✅ .gitignore                  # Root .gitignore
✅ backend/.gitignore          # Backend .gitignore
✅ backend/.env.example        # Template env file
✅ frontend/.env.example       # Template env file
✅ docker-compose.yml          # Docker configuration
✅ backend/Dockerfile          # Backend Docker image
✅ frontend/Dockerfile         # Frontend Docker image
```

### Files to Delete/Clean

```bash
# Remove if present
rm -f backend/info_o_env.txt
rm -f temp_prev.tsx

# Clean node_modules (will be reinstalled)
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Clean build artifacts
rm -rf backend/dist
rm -rf frontend/dist

# Remove local test artifacts
rm -rf backend/coverage
rm -rf frontend/coverage

# Clean logs
rm -f backend/*.log
rm -f frontend/*.log
```

---

## 🏷️ GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `WirtualnyTrener`
3. Description: "AI-Powered Intelligent Workout Planning System - NestJS + React + MongoDB"
4. Select: **Public** (for portfolio)
5. Initialize: **Don't** add README/License/gitignore (we have these)
6. Click **Create repository**

### Step 2: Add License

```bash
# Create MIT License (if not present)
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

git add LICENSE
git commit -m "docs: add MIT License"
```

### Step 3: Initialize Git (if needed)

```bash
# If not already a git repo
git init

# Set remote
git remote add origin https://github.com/YOUR_USERNAME/WirtualnyTrener.git

# Set default branch
git branch -M main
```

### Step 4: Create Initial Commit

```bash
# Stage all files
git add .

# Create commit with comprehensive message
git commit -m "Initial commit: WirtualnyTrener - AI workout plan generator

- Plan generation engine with quantile-based difficulty stratification
- Weighted cosine similarity for exercise recommendations
- AI refinement with Push/Pull ratio balancing
- Golden List curation system (1300+ exercises)
- Smart Swap intelligent substitution
- React+Vite frontend, NestJS+MongoDB backend
- Full test coverage and Docker support"
```

### Step 5: Push to GitHub

```bash
# Push to remote
git push -u origin main

# Verify
git remote -v  # Should show GitHub URL
```

---

## 📝 GitHub Repository Settings

### Step 1: Basic Settings

1. Go to Settings → General
2. Set description:
   ```
   AI-Powered Intelligent Workout Planning System
   TypeScript | NestJS | React | MongoDB
   ```
3. Set topics: `fitness` `ai` `typescript` `nestjs` `react` `mongodb` `algorithm`
4. **Social preview:** (optional) Add cover image

### Step 2: Branch Protection

1. Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request reviews (1 approve)
   - ✅ Require status checks to pass
   - ✅ Include administrators
   - ✅ Dismiss stale reviews

### Step 3: Security Settings

1. Settings → Security & analysis
2. Enable:
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Code scanning (GitHub Advanced Security)

### Step 4: Secrets (for CI/CD)

1. Settings → Secrets and variables → Actions
2. Add secrets (if setting up CI/CD):
   ```
   MONGODB_URI
   JWT_SECRET
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   DOCKER_USERNAME
   DOCKER_PASSWORD
   ```

---

## 🔄 Continuous Integration Setup

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      
      - name: Install dependencies
        run: cd backend && npm install
      
      - name: Run linter
        run: cd backend && npm run lint
      
      - name: Run tests
        run: cd backend && npm run test
      
      - name: Run integration tests
        run: cd backend && npm run test:integration
        env:
          MONGODB_URI: 'mongodb://localhost:27017/wirtualnytrener-test'
      
      - name: Build
        run: cd backend && npm run build

  frontend-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Run linter
        run: cd frontend && npm run lint
      
      - name: Run tests
        run: cd frontend && npm run test
      
      - name: Build
        run: cd frontend && npm run build
```

Create `.github/workflows/docker.yml`:

```yaml
name: Docker Build & Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  docker:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/wirtualnytrener-backend:latest
            ${{ secrets.DOCKER_USERNAME }}/wirtualnytrener-backend:${{ github.run_id }}
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/wirtualnytrener-frontend:latest
            ${{ secrets.DOCKER_USERNAME }}/wirtualnytrener-frontend:${{ github.run_id }}
```

---

## 📊 Additional GitHub Files

### Create Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug or issue
labels: bug
---

## Describe the bug
<!-- Clear description of what the bug is -->

## Steps to reproduce
1. Step 1
2. Step 2
3. ...

## Expected behavior
<!-- What should happen -->

## Actual behavior
<!-- What actually happens -->

## Environment
- Node version: 
- OS: 
- Browser: 

## Additional context
<!-- Any other relevant information -->
```

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest an idea for this project
labels: enhancement
---

## Description
<!-- Clear description of the feature -->

## Motivation
<!-- Why this feature? -->

## Proposed implementation
<!-- How would this work? -->

## Alternatives considered
<!-- Other approaches -->
```

### Code of Conduct

Create `CODE_OF_CONDUCT.md`:

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We are committed to providing a welcoming and inspiring community for all...

(Use standard template from contributor-covenant.org)
```

### Contributing Guidelines

Create `CONTRIBUTING.md`:

```markdown
# Contributing to WirtualnyTrener

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Follow the setup in [SETUP.md](SETUP.md)

## Development Process

1. Create tests for your changes
2. Ensure all tests pass: `npm run test`
3. Follow code style (ESLint + Prettier)
4. Keep commits clean and descriptive
5. Submit Pull Request with clear description

## Code Standards

- TypeScript strict mode
- 80%+ test coverage
- No console.log in production code
- Update README for new features/endpoints

## Pull Request Process

1. Update documentation
2. Add/update tests
3. Request review from maintainers
4. Address feedback
5. Merge when approved
```

---

## 🎯 Final Pre-Push Checklist

Before running `git push`:

```bash
# ✅ Section 1: Security
[ ] No .env files tracked
[ ] No google-credentials*.json files
[ ] No info_o_env.txt tracked
[ ] git secrets scan passed
[ ] .gitignore is comprehensive

# ✅ Section 2: Code Quality
[ ] npm run lint (backend) passed
[ ] npm run lint (frontend) passed
[ ] npm run test (backend) passed
[ ] npm run test (frontend) passed
[ ] Code formatted with Prettier

# ✅ Section 3: Documentation
[ ] README.md is complete and professional
[ ] SETUP.md is accurate
[ ] License file present
[ ] All API endpoints documented
[ ] Roadmap section included

# ✅ Section 4: Configuration
[ ] .env.example files updated
[ ] docker-compose.yml is valid
[ ] Dockerfiles present for both services
[ ] package.json dependencies correct

# ✅ Section 5: Repository
[ ] GitHub repository created
[ ] Remote URL configured
[ ] Branch protection rules set
[ ] Actions workflows configured
[ ] Topics/tags added

# Run this final check:
echo "=== Final Git Check ==="
git status
echo "=== Files to be committed ==="
git ls-files --cached | grep -E "\.(env|json\.secret|txt)" && echo "⚠️  SECRETS FOUND!" || echo "✅ No secrets"
echo "=== Ready to push: ==="
echo "git push -u origin main"
```

---

## 🚀 Push to GitHub

```bash
# Final verification
git status

# Push to GitHub
git push -u origin main

# Verify in browser
# https://github.com/YOUR_USERNAME/WirtualnyTrener
```

---

## 📈 Post-Push Steps

### 1. Update README Social Links

Edit README.md:

```markdown
## 👨‍💼 Author

**[Your Name]** – Full-stack TypeScript Developer  
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)
- Portfolio: [your-portfolio.com](https://your-portfolio.com)
```

### 2. Add GitHub Badge to README

Add to README intro:

```markdown
[![GitHub stars](https://img.shields.io/github/stars/yourusername/WirtualnyTrener?style=social)](https://github.com/yourusername/WirtualnyTrener)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/WirtualnyTrener?style=social)](https://github.com/yourusername/WirtualnyTrener)
```

### 3. Enable GitHub Pages (Optional)

For API documentation:

1. Go to Settings → Pages
2. Select Source: `main` branch
3. Select folder: `/docs`
4. Save

### 4. Create Release

```bash
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

Then on GitHub: Create Release from tag

---

## ✨ You're Ready!

Your project is now on GitHub with:

✅ Professional README with "wow factor"  
✅ All secrets removed and ignored  
✅ Complete setup instructions  
✅ Docker deployment support  
✅ CI/CD pipeline  
✅ Contribution guidelines  
✅ Production-ready structure  

**Perfect for recruiters and collaborators!** 🎉

---

**Final checklist item:** Share with your network and celebrate! 🚀
