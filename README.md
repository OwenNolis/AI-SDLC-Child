# AI-SDLC-Child

A child repository inheriting the full AI-SDLC pipeline from [OwenNolis/AI-SDLC](https://github.com/OwenNolis/AI-SDLC).

## How it works

All CI logic, AI tooling, and scripts live in the parent repo. When CI runs, it automatically pulls them via sparse checkout — nothing is duplicated here. This repo contains only:

- Your application code (`backend/`, `frontend/`)
- Functional analysis documents (`docs/functional-analysis/`)
- 5 thin caller workflows (`.github/workflows/`)
- Configuration (`sonar-project.properties`, `docker-compose.yml`, `.github/dependabot.yml`)

## Stack

- **Backend:** Java 21, Spring Boot 3, Maven
- **Frontend:** React 19, TypeScript, Vite
- **CI/CD:** GitHub Actions (inherited from AI-SDLC)
- **Code quality:** SonarCloud
- **Dependency management:** Dependabot + AI auto-review
- **Issue tracking:** Jira

## CI pipeline (inherited)

Every push to `main` and every pull request triggers the full AI-SDLC flow:

1. Sync Functional Analysis → Technical Analysis + test scenarios
2. Validate generated JSON artifacts
3. Generate backend and frontend tests
4. Run backend tests (Maven) and frontend tests (Jest)
5. SonarCloud scan + Quality Gate check
6. Build and push Docker images to GHCR
7. Deploy via Docker Compose

If SonarCloud reports HIGH or MEDIUM issues, the AI Code Fixer workflow triggers automatically, fixes the issues, and opens a PR.

## Features

### 1. LangGraph AI Document Pipeline

When a Functional Analysis (FA) document is placed in `docs/functional-analysis/`, the CI pipeline automatically processes it through a multi-step LangGraph agent powered by Google Gemini. The agent classifies the FA type (`rest-api`, `full-stack`, `frontend-only`, or `event-driven`) and then routes it through a series of specialised nodes: requirement extraction, domain model generation, API or messaging design, backend and frontend architecture, traceability matrix assembly, and finally a full Technical Analysis (TA) document in both Markdown and structured JSON. The JSON output is validated against a schema and self-corrected by the AI if it fails. The result is a detailed TA stored in `docs/technical-analysis/` that reflects the actual implementation design.

### 2. PR Validation (CI)

Every pull request and push to `main` triggers a full CI pipeline inherited from the parent repo. It builds the backend with Maven (including JaCoCo coverage), runs Jest tests on the frontend (generating lcov coverage), uploads both coverage reports to SonarCloud, and enforces the Quality Gate. If the gate fails, the PR cannot be merged. The pipeline also builds Docker images for both backend and frontend and pushes them to GHCR. All of this logic lives in the parent repo — the child only holds a 12-line caller workflow.

### 3. SonarCloud Analysis + AI Code Fixes

SonarCloud runs on every push and PR to analyse code quality: coverage, duplication, reliability, security, and maintainability. The analysis reads JaCoCo XML for Java coverage and lcov for TypeScript coverage from the paths defined in `sonar-project.properties`. After CI completes, if SonarCloud reports issues the AI Code Fixes workflow triggers automatically. It fetches the open issues from the SonarQube API, sends them to Gemini, and applies the generated fixes to the source code. The fixes are committed to a new branch and a PR is opened automatically. A summary of the Quality Gate result is also posted as a comment on the original PR.

### 4. Dependabot Automation + Jira Integration

Dependabot monitors four ecosystems daily: Maven (`/backend`), npm (`/frontend`), npm (`/ai/validator`), and GitHub Actions. Minor and patch updates are grouped into a single PR per ecosystem to reduce noise. Major version bumps for the frontend are blocked entirely. When Dependabot opens a PR, two things happen in parallel. First, the Dependabot automation workflow reviews the PR using Gemini — it reads the changelog and the actual diff, assesses the risk, and either auto-approves and merges patch-level updates or leaves a review comment explaining why a manual review is needed. Second, the Jira integration workflow creates a Jira task in the configured project. When the PR is closed (merged or declined), the Jira task is automatically closed.

### 5. Docker Deployment + GHCR Packages

The backend is packaged as a minimal `eclipse-temurin:21-jre-alpine` image serving the Spring Boot JAR on port 9090. The frontend is packaged as an `nginx:alpine` image serving the Vite production build on port 80. Both images are built by CI and pushed to the GitHub Container Registry under the org's namespace. On the deployment server, `docker-compose.yml` runs both containers alongside Watchtower. Watchtower polls GHCR every 30 seconds and automatically pulls and restarts containers whenever a new image is available, so every merged PR is deployed to the server without any manual intervention.

### 6. Parent / Child Repository Pattern

The parent repo (`AI-SDLC`) owns all reusable SDLC tooling: workflow logic, AI scripts, the LangGraph agent, schema files, and skeleton templates. The child repo delegates everything to the parent via the `uses:` directive with `secrets: inherit`, meaning secrets are never duplicated across repos. At runtime the parent repo is sparse-checked out into the child's workspace at `.sdlc-tools/`, giving the AI scripts access to the child's application source files. Any improvement made in the parent — a better prompt, a new validation step, a script fix — is immediately available to all child repos on the next CI run. The child repo is kept intentionally thin: application code, five caller workflows, and a handful of config files.

---

## Running locally

**Backend**
```bash
cd backend
mvn clean spring-boot:run
# http://localhost:9090
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

**Docker Compose**
```bash
docker compose up
# Backend: http://localhost:8080
# Frontend: http://localhost:3000
```

## Adding a new feature

1. Create `docs/functional-analysis/<feature-id>.md` with the functional requirements
2. Set the `FEATURE_ID` repository variable in GitHub Settings to `<feature-id>`
3. Push — the AI flow runs automatically

## Project structure

```
.github/
  workflows/          # Thin caller workflows (delegate to AI-SDLC)
  dependabot.yml
backend/              # Spring Boot application
frontend/             # React application
docs/
  functional-analysis/   # Input: written by developer
  technical-analysis/    # Generated by AI
  test-scenarios/        # Generated by AI
sonar-project.properties
docker-compose.yml
```
