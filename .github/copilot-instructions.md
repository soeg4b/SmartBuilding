# Project Conventions — Multi-Agent Production App Builder

## Purpose
This workspace uses 13 integrated agents to build **production-ready web and mobile applications** end-to-end. Every agent reads from and writes to a shared project folder.

## Output Directory Convention
All application output MUST go to:
```
/run/YYYYMMDD_Application_Theme/
```
- `YYYYMMDD` = date when the project is initiated (e.g., `20260412`)
- `Application_Theme` = short snake_case name describing the app (e.g., `E_Commerce_Platform`)

Example: `/run/20260412_E_Commerce_Platform/`

## Project Output Structure
```
/run/YYYYMMDD_Application_Theme/
├── .artifacts/                    # Agent handoff documents (internal)
│   ├── 01-creator-vision.md
│   ├── 02-pm-roadmap.md
│   ├── 03-sa-system-design.md
│   ├── 04-uiux-design.md
│   ├── 05-data-schema.md
│   ├── 06-coder-plan.md
│   ├── 07-qa-test-plan.md
│   ├── 08-tester-results.md
│   ├── 09-security-review.md
│   ├── 10-devops-pipeline.md
│   ├── 11-documentation.md
│   └── 12-support-playbook.md
├── src/                           # Application source code
│   ├── frontend/                  # Frontend app (Next.js / React Native)
│   ├── backend/                   # Backend API (Node.js / Express / Fastify)
│   ├── shared/                    # Shared types, utils, constants
│   └── database/                  # Migrations, seeds, schema files
├── tests/                         # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                          # User & developer documentation
├── infra/                         # Docker, CI/CD, deployment configs
│   ├── docker/
│   ├── ci/
│   └── monitoring/
├── public/                        # Static assets
├── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Agent Integration Protocol

### Artifact Handoff Rules
1. Each agent MUST read the artifact from the previous stage before starting work.
2. Each agent MUST write its output as a markdown artifact in `.artifacts/`.
3. Artifacts use numbered prefixes to enforce execution order.
4. Each artifact MUST include a `## Handoff` section with:
   - Inputs consumed (which prior artifacts)
   - Outputs produced (files created/modified)
   - Open questions for the next stage
   - Go/No-Go recommendation

### Agent Execution Order
```
[1] Creator          → .artifacts/01-creator-vision.md
[2] Product Manager  → .artifacts/02-pm-roadmap.md
[3] System Analyst   → .artifacts/03-sa-system-design.md
[4] UI/UX            → .artifacts/04-uiux-design.md
[5] Data             → .artifacts/05-data-schema.md
[6] Coder            → .artifacts/06-coder-plan.md + src/**
[7] QA               → .artifacts/07-qa-test-plan.md
[8] Tester           → .artifacts/08-tester-results.md + tests/**
[9] Security         → .artifacts/09-security-review.md
[10] DevOps          → .artifacts/10-devops-pipeline.md + infra/**
[11] Documentation   → .artifacts/11-documentation.md + docs/**
[12] Support         → .artifacts/12-support-playbook.md
```

### Default Tech Stack (can be overridden per project)
- **Frontend Web**: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Frontend Mobile**: React Native / Expo (TypeScript)
- **Backend**: Node.js with Express or Fastify (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT + bcrypt (or NextAuth.js for web)
- **Testing**: Vitest (unit), Playwright (e2e), Supertest (API)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker + docker-compose
- **Monitoring**: Basic health checks + structured logging

### Production-Ready Checklist
Every delivered application MUST include:
- [ ] Environment variable configuration (.env.example)
- [ ] Docker containerization (docker-compose.yml)
- [ ] Database migrations ready to run
- [ ] API validation and error handling
- [ ] Authentication and authorization
- [ ] CORS and security headers configured
- [ ] Basic test coverage (unit + integration)
- [ ] API documentation
- [ ] README with setup instructions
- [ ] Health check endpoint
- [ ] Structured logging
- [ ] Input sanitization (XSS, SQL injection prevention)
