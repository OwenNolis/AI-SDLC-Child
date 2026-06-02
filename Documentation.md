# AI-SDLC-Child — Feature Documentation

This document describes all six features of the AI-SDLC-Child repository, how they work, what files they use, and how to transfer them to a new organisation's repository.

---

## Architecture: Parent / Child Repositories

The system is split across two repositories:

| Repository | Role |
|---|---|
| **AI-SDLC** (parent) | Owns all reusable workflow logic, scripts, and AI tooling |
| **AI-SDLC-Child** (child) | Application code only; delegates CI/CD entirely to the parent |

### How the connection works

All GitHub Actions workflows in the child repo use the `uses:` directive to call a named workflow in the parent repo:

```yaml
jobs:
  ci:
    uses: OwenNolis/AI-SDLC/.github/workflows/ci.yml@main
    secrets: inherit
```

`secrets: inherit` forwards all secrets from the child repo into the called workflow so no secrets are duplicated. Repository variables (GitHub Variables) are passed explicitly via `with:`.

At CI runtime the parent repo is also **sparse-checked out** into the child's workspace at `.sdlc-tools/`. This gives the parent's AI scripts access to the child repo's source files (for code analysis, test generation, etc.). The `.sdlc-tools/` directory is never committed to the child repo — it is populated fresh on every CI run.

```
AI-SDLC-Child/
├── .github/workflows/    ← thin caller workflows only
├── backend/              ← Spring Boot application
├── frontend/             ← React/TypeScript application
├── docker-compose.yml
├── sonar-project.properties
└── .sdlc-tools/          ← runtime sparse-checkout of AI-SDLC parent (not committed)
    ├── .github/scripts/  ← shell scripts for AI fixes, SonarQube, etc.
    ├── ai/agent/langgraph/ ← Python LangGraph pipeline
    └── Jenkinsfile
```

---

## GitHub Secrets

These secrets must be configured in the child repo (Settings → Secrets → Actions).

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions. No manual setup needed. |
| `SONAR_TOKEN` | SonarQube Cloud user token. Generate in SonarCloud → Account → Security. |
| `GEMINI_API_KEY` | Google Gemini API key. Used for AI code fixes, dependency review, and LangGraph TA generation. |
| `JIRA_USER_EMAIL` | Email address of the Jira account used for API calls. |
| `JIRA_API_TOKEN` | Jira API token. Generate in Atlassian account settings. |
| `PAT_TOKEN` | GitHub Personal Access Token (see PAT section below). Used for pushing AI fix branches and approving Dependabot PRs. |

---

## GitHub Variables

These are repository-level variables (Settings → Variables → Actions) passed into the parent workflows.

| Variable | Example value | Description |
|---|---|---|
| `FEATURE_ID` | `feature-001-support-ticket` | Identifier for the current feature. Used by LangGraph agent and AI fix flow. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name to use for all AI operations. |
| `SONAR_PROJECT_KEY` | `OwenNolis_AI-SDLC-Child` | SonarQube Cloud project key. Must match `sonar-project.properties`. |
| `SONAR_ORGANIZATION` | `owennolis` | SonarQube Cloud organisation slug. |
| `DOCKER_OWNER` | `owennolis` | GitHub username or org name — used as the GHCR image owner. |
| `DOCKER_IMAGE_BACKEND` | `ghcr.io/owennolis/ai-sdlc-child-backend` | Full GHCR image name for the backend. |
| `DOCKER_IMAGE_FRONTEND` | `ghcr.io/owennolis/ai-sdlc-child-frontend` | Full GHCR image name for the frontend. |
| `JIRA_PROJECT_KEY` | `SDLC` | Jira project key where Dependabot issues are created. |
| `JIRA_DOMAIN` | `mycompany.atlassian.net` | Jira Cloud domain (without `https://`). |

---

## GitHub Personal Access Token (PAT)

A PAT is required and stored as the `PAT_TOKEN` secret.

**Required scopes:**

| Scope | Why |
|---|---|
| `repo` | Read/write access to the child repo (push AI-fix branches, merge PRs). |
| `workflow` | Trigger and modify GitHub Actions workflows. |
| `read:packages` / `write:packages` | Pull and push Docker images to GHCR. |

Generate the token at: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens (or classic).

> The token must belong to a user who has write access to the child repository.

---

## Feature 1 — Dependabot PR + Jira Issues

### What it does

When Dependabot opens a pull request to update a dependency, a Jira task is automatically created. When the PR is merged or closed, the Jira task is automatically closed.

### Files

| File | Description |
|---|---|
| `.github/workflows/dependabot-jira.yml` | Caller workflow. Listens for PR open/reopen/close events from `dependabot[bot]` and delegates to the parent workflow. |
| `.github/dependabot.yml` | Dependabot configuration. Defines which ecosystems to watch, schedule, grouping rules, and PR limits. |

### How it works

1. Dependabot opens a PR for an outdated dependency.
2. The `dependabot-jira.yml` workflow fires on `pull_request` events.
3. If the PR was opened or reopened it calls the parent workflow with `mode: create`.
4. If the PR was closed it calls the parent workflow with `mode: close`.
5. The parent workflow uses the Jira REST API v3 with `JIRA_USER_EMAIL` + `JIRA_API_TOKEN` to create or close a task in the configured Jira project.

### Dependabot configuration

The `.github/dependabot.yml` currently monitors four ecosystems:

- **maven** — `/backend` directory, daily, grouped minor+patch updates
- **npm** — `/frontend` directory, daily at 08:00 (Europe/Brussels), grouped minor+patch, major versions blocked
- **npm** — `/ai/validator` directory (AI tooling dependencies)
- **github-actions** — root, daily, keeps action versions current

### How to use

No manual action is needed after setup. Dependabot runs automatically on the configured schedule and creates PRs. Jira tasks appear as soon as the PR is opened.

### Transfer to a new organisation

1. Copy `.github/workflows/dependabot-jira.yml` to the new repo unchanged.
2. Copy `.github/dependabot.yml` and adjust the `directory` paths and `schedule` to match the new project.
3. Set the GitHub Variables `JIRA_PROJECT_KEY` and `JIRA_DOMAIN`.
4. Set the GitHub Secrets `JIRA_USER_EMAIL` and `JIRA_API_TOKEN`.
5. Make sure the parent repo `OwenNolis/AI-SDLC` is accessible (public, or the PAT has access).

---

## Feature 2 — SonarQube AI Fix Flow + AI Code Fixes

### What it does

Every push and pull request runs SonarQube static analysis. If the quality gate fails (code coverage, duplications, security issues) an AI fix workflow is triggered that uses Gemini to generate code fixes and post them as a new branch + PR.

This feature consists of two workflows that work together:

- **SonarCloud Analysis** — runs analysis, enforces quality gate, posts a PR comment with the result.
- **AI Code Fixes** — triggers after CI, fetches SonarQube issues, generates fixes via Gemini, and opens a PR.

### Files

| File | Description |
|---|---|
| `.github/workflows/sonarcloud.yml` | Caller for SonarCloud analysis. Runs on push to `main` and on every PR. |
| `.github/workflows/ai-code-fixes.yml` | Caller for AI fix workflow. Triggered when CI completes. |
| `sonar-project.properties` | SonarQube project configuration. Defines sources, tests, coverage report paths, and exclusions. |
| `backend/pom.xml` | Contains the JaCoCo Maven plugin for generating Java code coverage (`jacoco.xml`). |
| `frontend/package.json` | Contains Jest configuration; coverage is exported as `lcov.info`. |

**Parent repo scripts (available at runtime via `.sdlc-tools/`):**

| Script | Description |
|---|---|
| `.github/scripts/ai-fix-utils.sh` | Core functions: `fetch-sonar-issues`, `apply-ai-fixes`, `boost-coverage`. |
| `.github/scripts/sonar-pr-comment.sh` | Posts a SonarQube quality gate summary as a PR comment using the GitHub API. |
| `.github/ai-fix-config.env` | Default configuration values for the AI fix flow (thresholds, model selection, etc.). |

### How `sonar-project.properties` works

```properties
sonar.organization=owennolis
sonar.projectKey=OwenNolis_AI-SDLC-Child

sonar.sources=backend/src/main/java,frontend/src
sonar.tests=backend/src/test/java,frontend/src
sonar.coverage.jacoco.xmlReportPaths=backend/target/site/jacoco/jacoco.xml
sonar.typescript.lcov.reportPaths=frontend/coverage/lcov.info
```

SonarQube reads Java coverage from the JaCoCo XML report and TypeScript coverage from the lcov report generated by Jest. The `sonar.exclusions` property ensures generated code, build artefacts, and test files are not counted as source.

### How JaCoCo works (backend)

The `jacoco-maven-plugin` in `pom.xml` has two executions:
1. `prepare-agent` — instruments the JVM before tests run.
2. `report` (phase: `test`) — generates `target/site/jacoco/jacoco.xml` after tests complete.

Running `mvn test` or `mvn verify` produces the coverage report automatically.

### How Jest coverage works (frontend)

Jest is configured to output lcov format to `frontend/coverage/lcov.info`. Running `npm test -- --coverage` produces the report.

### AI Code Fixes flow

1. CI completes (success or failure).
2. `ai-code-fixes.yml` triggers via `workflow_run`.
3. The parent workflow sparse-checks out the child repo, fetches open SonarQube issues via the SonarQube API, and sends them to Gemini for fix suggestions.
4. If Gemini produces valid fixes, they are committed to a new branch (`ai-fix/...`) and a PR is opened automatically.
5. A PR comment with the quality gate summary is posted by `sonar-pr-comment.sh`.

### Transfer to a new organisation

1. Copy `.github/workflows/sonarcloud.yml` and `.github/workflows/ai-code-fixes.yml`.
2. Copy `sonar-project.properties` and update `sonar.organization`, `sonar.projectKey`, `sonar.projectName`, and the source/test paths to match the new project.
3. Add the JaCoCo plugin to the Java build tool (`pom.xml` for Maven).
4. Configure Jest to output lcov coverage in the frontend `package.json` / `jest.config`.
5. Set the GitHub Secrets `SONAR_TOKEN` and `GEMINI_API_KEY`.
6. Set the GitHub Variables `SONAR_PROJECT_KEY`, `SONAR_ORGANIZATION`, `GEMINI_MODEL`, `FEATURE_ID`.
7. Create a SonarCloud project and link it to the GitHub repository.

---

## Feature 3 — PR Validation (CI)

### What it does

Every pull request and push to `main` triggers a full CI pipeline: build, test, code coverage, and SonarQube quality gate. The pipeline runs in the parent repo so the child repo only needs a minimal caller workflow.

### Files

| File | Description |
|---|---|
| `.github/workflows/ci.yml` | Caller workflow. Triggers on push to `main` and all PRs. Delegates to the parent CI workflow. |
| `backend/pom.xml` | Maven build config. JaCoCo coverage is generated here. |
| `frontend/package.json` | Node.js build and test config. Jest runs with coverage output. |
| `backend/Dockerfile` | Multi-stage-style Dockerfile: copies the Maven-built JAR into `eclipse-temurin:21-jre-alpine`. Exposes port 9090. |
| `frontend/Dockerfile` | Copies the Vite `dist/` build into `nginx:alpine`. Serves on port 80. |

### What CI does (parent workflow)

The parent CI workflow runs the following steps in sequence:

1. **Build backend** — `mvn verify` (compiles, runs tests, generates JaCoCo coverage).
2. **Build frontend** — `npm ci && npm test -- --coverage && npm run build` (runs Jest, generates lcov, builds production bundle).
3. **SonarQube analysis** — uploads both coverage reports to SonarCloud and enforces the quality gate.
4. **Docker build & push** — builds both Docker images and pushes them to GHCR using the `DOCKER_IMAGE_BACKEND` / `DOCKER_IMAGE_FRONTEND` variables.

A PR cannot be merged while the quality gate is red.

### How to use

No action needed — CI runs automatically on every push and PR. To check status, go to the Actions tab or look at the status checks on the PR.

### Transfer to a new organisation

1. Copy `.github/workflows/ci.yml` to the new repo.
2. Update all `with:` variables to match your organisation's GitHub Variables.
3. Create the GitHub Variables listed in the Variables section.
4. Create the GitHub Secrets `SONAR_TOKEN`, `GEMINI_API_KEY`, `PAT_TOKEN`.
5. Ensure the parent repo is accessible.
6. Add Dockerfiles to `backend/` and `frontend/` following the same pattern, adjusting exposed ports and base images as needed.

---

## Feature 4 — LangGraph Agent Analysis Support

### What it does

The LangGraph agent converts a Functional Analysis (FA) document into a Technical Analysis (TA) document. It reads a Markdown FA file, sends it through a multi-step AI pipeline powered by Google Gemini, and produces a structured TA as both Markdown and JSON.

This feature runs **locally or in CI** and uses the tools in `.sdlc-tools/ai/agent/langgraph/`.

### Files

| File | Description |
|---|---|
| `.sdlc-tools/ai/agent/langgraph/fa_to_ta.py` | Main LangGraph agent. Reads the FA, runs all pipeline nodes, writes TA output. |
| `.sdlc-tools/ai/agent/langgraph/requirements.txt` | Python dependencies: `langgraph`, `langchain-google-genai`, `jsonschema`, `python-dotenv`. |
| `.sdlc-tools/ai/agent/langgraph/templates/skeletons/` | TA skeleton templates per FA type (`rest-api`, `full-stack`, `frontend-only`, `event-driven`). |
| `docs/functional-analysis/<feature-id>.md` | Input: the FA document (written by developer or product owner). |
| `docs/technical-analysis/<feature-id>.md` | Output: the generated TA Markdown document. |
| `docs/technical-analysis/<feature-id>.ta.json` | Output: the generated TA as structured JSON (validated against schema). |
| `.env` | Local environment variables including `GEMINI_API_KEY` and `GEMINI_MODEL`. |

### Pipeline steps (LangGraph nodes)

The `fa_to_ta.py` script builds a `StateGraph` with the following nodes:

| Node | Description |
|---|---|
| `classify_fa` | Detects FA type: `rest-api`, `full-stack`, `frontend-only`, or `event-driven`. Loads the matching TA skeleton. |
| `parse_fa` | Extracts requirements (REQ-NNN), scope, assumptions, and open questions. |
| `generate_domain_model` | Generates entity model with fields, constraints, and test cases. |
| `generate_api_design` | Generates REST endpoint design with request/response schemas and validation rules. |
| `generate_messaging_design` | (event-driven only) Generates topics, events, DLQ and retry strategy. |
| `generate_backend_design` | Generates Spring Boot module/class structure (Controller, Service, Repository, etc.). |
| `generate_frontend_design` | Generates React routes, components, and test strategy. |
| `generate_traceability` | Generates traceability matrix linking each REQ to backend classes, frontend components, and tests. |
| `assemble_ta_json` | Merges all node outputs into a single TA JSON object. |
| `validate_schema` | Validates TA JSON against `ta.schema.json`. |
| `self_correct` | If validation fails, sends the JSON + errors back to Gemini for self-correction (max 3 retries). |
| `generate_ta_markdown` | Generates the final Markdown TA document using the assembled JSON and skeleton. |

The graph adapts routing based on FA type: `frontend-only` skips domain/API/backend nodes; `event-driven` replaces the API design node with messaging design; `rest-api` skips frontend generation.

### How to use

**Prerequisites:** Python 3.11+, a Gemini API key.

```bash
# From the repo root
cd .sdlc-tools/ai/agent/langgraph
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Set environment variable
export GEMINI_API_KEY=your-key
export GEMINI_MODEL=gemini-2.5-flash   # optional, defaults to gemini-2.5-flash-lite

# Run the agent
python fa_to_ta.py feature-001-my-feature
# With manual FA type override:
python fa_to_ta.py feature-001-my-feature --fa-type full-stack
```

The FA file must exist at `docs/functional-analysis/feature-001-my-feature.md` relative to the repo root.

Output is written to:
- `docs/technical-analysis/feature-001-my-feature.md`
- `docs/technical-analysis/feature-001-my-feature.ta.json`

### Transfer to a new organisation

1. The agent lives entirely in the parent repo (`.sdlc-tools/`) — no files need to be copied to the child repo.
2. Create a `docs/functional-analysis/` directory in the child repo and place FA Markdown files there.
3. Set `GEMINI_API_KEY` in `.env` (local) or as a GitHub Secret for CI use.
4. Set the GitHub Variable `FEATURE_ID` to the feature identifier to be processed in CI.
5. Set the GitHub Variable `GEMINI_MODEL` to the desired Gemini model name.

---

## Feature 5 — Docker Deployment + Packages

### What it does

Backend and frontend are containerised with Docker. Images are built by CI and published to the GitHub Container Registry (GHCR). A `docker-compose.yml` runs both containers on a server, with Watchtower polling GHCR every 30 seconds to automatically update running containers when a new image is pushed.

### Files

| File | Description |
|---|---|
| `docker-compose.yml` | Defines three services: `backend`, `frontend`, `watchtower`. Image names are read from environment variables. |
| `backend/Dockerfile` | Builds the backend image from the compiled JAR using `eclipse-temurin:21-jre-alpine`. |
| `frontend/Dockerfile` | Builds the frontend image from the Vite `dist/` output using `nginx:alpine` + custom `nginx.conf`. |
| `frontend/nginx.conf` | Nginx configuration for serving the React SPA (handles client-side routing). |

### Docker image details

**Backend image:**
- Base: `eclipse-temurin:21-jre-alpine` (Java 21 JRE, minimal Alpine image)
- Copies the Maven-built `target/*.jar` into `/app/app.jar`
- Exposes port `9090`
- Started with `java -jar app.jar`

**Frontend image:**
- Base: `nginx:alpine`
- Copies the Vite `dist/` folder to `/usr/share/nginx/html`
- Uses a custom `nginx.conf` for SPA routing
- Exposes port `80`

### docker-compose.yml

```yaml
services:
  backend:
    image: ghcr.io/owennolis/ai-sdlc-child-backend:latest
    ports:
      - "8080:9090"
    restart: unless-stopped

  frontend:
    image: ghcr.io/owennolis/ai-sdlc-child-frontend:latest
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 30
```

Watchtower mounts the Docker socket to watch running containers and pulls updated images from GHCR every 30 seconds automatically. No manual restarts are needed after a new CI build.

### How to deploy

On the deployment server:

```bash
# Authenticate to GHCR (only needed once per server)
echo $PAT_TOKEN | docker login ghcr.io -u <github-username> --password-stdin

# Pull and start
docker compose pull
docker compose up -d
```

After initial start, Watchtower handles all updates automatically whenever CI pushes a new image.

### Transfer to a new organisation

1. Copy `docker-compose.yml`, `backend/Dockerfile`, and `frontend/Dockerfile` to the new repo.
2. Update the `image:` values in `docker-compose.yml` to point to the new organisation's GHCR paths, or leave them as environment-variable references and set `DOCKER_IMAGE_BACKEND` / `DOCKER_IMAGE_FRONTEND`.
3. Set the GitHub Variables `DOCKER_OWNER`, `DOCKER_IMAGE_BACKEND`, `DOCKER_IMAGE_FRONTEND`.
4. Ensure `PAT_TOKEN` has `write:packages` scope so CI can push images to GHCR.
5. On the deployment server, authenticate to GHCR using the PAT and run `docker compose up -d`.

---

## Feature 6 — Library: Parent / Child Repository Pattern

### What it does

The parent/child pattern is the architecture that makes all the other features work. It separates reusable SDLC tooling (AI scripts, workflow logic, agent code) from the application repositories that use them. A child repo only needs thin caller workflows — all the logic lives in and is maintained in the parent.

### How the pattern works

**In the child repo (AI-SDLC-Child):**

All workflow files are minimal callers:

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    uses: OwenNolis/AI-SDLC/.github/workflows/ci.yml@main
    secrets: inherit
    with:
      FEATURE_ID: ${{ vars.FEATURE_ID }}
      GEMINI_MODEL: ${{ vars.GEMINI_MODEL }}
      SONAR_PROJECT_KEY: ${{ vars.SONAR_PROJECT_KEY }}
      SONAR_ORGANIZATION: ${{ vars.SONAR_ORGANIZATION }}
      DOCKER_OWNER: ${{ vars.DOCKER_OWNER }}
      DOCKER_IMAGE_BACKEND: ${{ vars.DOCKER_IMAGE_BACKEND }}
      DOCKER_IMAGE_FRONTEND: ${{ vars.DOCKER_IMAGE_FRONTEND }}
```

**In the parent repo (AI-SDLC):**

The called workflows contain all build steps, AI logic, Docker push commands, Jira API calls, etc.

**Runtime sparse-checkout:**

The parent CI workflow sparse-checks out the AI-SDLC repo into the child's workspace at `.sdlc-tools/`. This gives AI scripts direct access to the child's source files without requiring the scripts to be copied.

```bash
# Performed automatically by the parent workflow at CI start:
git clone --filter=blob:none --sparse https://github.com/OwenNolis/AI-SDLC .sdlc-tools
cd .sdlc-tools && git sparse-checkout set ai .github/scripts .github
```

### Benefits

- **Single place to update**: Fix a bug or improve the AI fix logic once in the parent; all child repos pick it up automatically on the next CI run (pinned to `@main`).
- **No duplication**: Application repos contain only application code.
- **Isolation**: Child repos cannot accidentally break the shared tooling.

### Caller workflow files in the child repo

| File | Parent workflow called |
|---|---|
| `.github/workflows/ci.yml` | `OwenNolis/AI-SDLC/.github/workflows/ci.yml@main` |
| `.github/workflows/sonarcloud.yml` | `OwenNolis/AI-SDLC/.github/workflows/sonarcloud.yml@main` |
| `.github/workflows/ai-code-fixes.yml` | `OwenNolis/AI-SDLC/.github/workflows/ai-code-fixes.yml@main` |
| `.github/workflows/dependabot-jira.yml` | `OwenNolis/AI-SDLC/.github/workflows/dependabot-jira.yml@main` |
| `.github/workflows/dependabot-automation.yml` | `OwenNolis/AI-SDLC/.github/workflows/dependabot-automation.yml@main` |

### Transfer to a new organisation

To apply this pattern to an entirely new organisation:

1. **Fork or transfer the parent repo** (`AI-SDLC`) to the new organisation, e.g. `MyOrg/AI-SDLC`.
2. In the new child repo, copy all five workflow files from `.github/workflows/` and update the `uses:` paths from `OwenNolis/AI-SDLC/...` to `MyOrg/AI-SDLC/...`.
3. Make the parent repo accessible to the child repo (public, or ensure the PAT has cross-repo read access).
4. Configure all GitHub Secrets and Variables listed in this document.
5. The first CI run will sparse-checkout the parent repo and run the full pipeline.

> **Version pinning:** Callers use `@main`. For production use, pin to a specific release tag (e.g. `@v1.2.0`) to avoid unintentional breaking changes from parent updates.

---

## Quick Reference: Required Configuration per Feature

| Feature | Secrets needed | Variables needed |
|---|---|---|
| Dependabot + Jira | `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`, `PAT_TOKEN` | `JIRA_PROJECT_KEY`, `JIRA_DOMAIN` |
| SonarQube + AI Fixes | `SONAR_TOKEN`, `GEMINI_API_KEY`, `PAT_TOKEN` | `SONAR_PROJECT_KEY`, `SONAR_ORGANIZATION`, `GEMINI_MODEL`, `FEATURE_ID` |
| PR Validation (CI) | `SONAR_TOKEN`, `GEMINI_API_KEY`, `PAT_TOKEN` | All SONAR + DOCKER variables |
| LangGraph Agent | `GEMINI_API_KEY` | `GEMINI_MODEL`, `FEATURE_ID` |
| Docker Deployment | `PAT_TOKEN` (packages scope) | `DOCKER_OWNER`, `DOCKER_IMAGE_BACKEND`, `DOCKER_IMAGE_FRONTEND` |
| Parent/Child Pattern | `PAT_TOKEN` | All variables for the features used |
