# AGENTS.md — ClipForge

This file is a reference for AI coding agents working on the project. It describes the architecture, conventions, and commands you need to know to be productive.

## Project overview

ClipForge (monorepo name `youtubers-shortform`) is a SaaS MVP that converts long-form videos into vertical short-form clips for TikTok, Reels, and YouTube Shorts.

The repository is a **pnpm workspace + Turborepo** with two applications and one shared package:

- `apps/web` — Next.js frontend that handles uploads, job polling, and clip downloads.
- `apps/api` — FastAPI backend that provides presigned URLs, registers videos, queues processing jobs, and serves job status.
- `packages/shared` — Shared TypeScript type definitions used by the frontend.

The backend offloads video processing to a **Celery worker** that downloads uploads from S3-compatible storage, runs FFmpeg to crop clips to 9:16, and uploads the results.

## Repository layout

```
.
├── apps/
│   ├── api/                 # FastAPI backend + Celery worker
│   │   ├── app/
│   │   │   ├── config.py    # Pydantic settings loaded from env
│   │   │   ├── database.py  # SQLAlchemy engine/session/Base
│   │   │   ├── main.py      # FastAPI app, lifespan, router wiring
│   │   │   ├── models.py    # SQLAlchemy ORM models
│   │   │   ├── schemas.py   # Pydantic request/response models
│   │   │   ├── routers/     # videos, clips, jobs endpoints
│   │   │   ├── services/    # StorageService (S3/MinIO client)
│   │   │   └── worker/      # Celery app + process_video task
│   │   ├── alembic/         # Alembic migrations
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/                 # Next.js frontend
│       ├── app/             # App Router pages (page.tsx, layout.tsx)
│       ├── components/      # UploadForm, VideoList
│       ├── lib/api.ts       # Fetch wrappers for the backend API
│       ├── middleware.ts    # Clerk auth middleware
│       ├── next.config.ts
│       └── package.json
├── packages/
│   └── shared/              # Shared TypeScript types (Video, Clip, Job)
├── infra/
│   └── docker-compose.yml   # Local Postgres, Redis, MinIO, API, worker
├── .env.example             # Environment variables template
├── package.json             # Root monorepo scripts
├── pnpm-workspace.yaml
└── turbo.json               # Turborepo pipeline
```
## Technology stack

### Frontend

- **Next.js 16.2.10** with App Router
- **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **Clerk** (`@clerk/nextjs`) for authentication
- **lucide-react** for icons

### Backend

- **Python 3.12**
- **FastAPI 0.115.0** + **Uvicorn**
- **SQLAlchemy 2.0** + **Alembic**
- **PostgreSQL** for persistence
- **Celery 5.4** + **Redis** for async task queue
- **boto3** for S3-compatible object storage
- **ffmpeg-python** + system **FFmpeg** for video processing
- **Sentry SDK** is installed but not wired to a DSN by default

### Infrastructure / deployment

- **Docker Compose** locally (`infra/docker-compose.yml`)
- **MinIO** for local S3-compatible storage
- Mentioned for production: Railway/Render and Cloudflare R2 (not yet configured)

## Build and dev commands

The root `package.json` delegates everything to Turborepo:

```bash
pnpm install                 # install workspace dependencies
pnpm dev                     # turbo run dev (starts web dev server; API must be run separately)
pnpm build                   # turbo run build (builds web + shared)
pnpm lint                    # turbo run lint
pnpm test                    # turbo run test (currently no tests are present)
```

### Shared package

The frontend depends on `@youtubers/shared` via `workspace:*`. Build it before the web app if types change:

```bash
pnpm --filter @youtubers/shared build    # compiles src/index.ts to dist/
pnpm --filter @youtubers/shared dev      # tsc --watch
```

### Local backend stack

From the repo root:

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
```

This starts Postgres, Redis, MinIO, the API server (`uvicorn` with reload), and a Celery worker. The API is available at `http://localhost:8000` and the MinIO console at `http://localhost:9001` (credentials `minioadmin` / `minioadmin`).

Run Alembic migrations inside the API container when schema changes:

```bash
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

Note: the FastAPI lifespan currently calls `Base.metadata.create_all(bind=engine)`, so tables are auto-created on startup. Alembic migrations exist but must be run explicitly.

### Frontend only

```bash
pnpm --filter web dev        # http://localhost:3000
pnpm --filter web build
pnpm --filter web lint       # runs eslint via Next.js config
```

## Code style guidelines

### TypeScript / Next.js

- Strict TypeScript is enabled (`strict: true`).
- Path alias `@/*` maps to the `apps/web` root.
- Use React Server Components by default; mark client components with `"use client"` only when needed (e.g. forms with `useState`).
- Tailwind classes are written directly on elements using the project's zinc/dark color scheme.
- Icons come from `lucide-react`.

### Python / FastAPI

- Use Pydantic models in `app/schemas.py` for request/response validation.
- Keep route handlers in `app/routers/`.
- Business logic and external services belong in `app/services/`.
- Use SQLAlchemy ORM models from `app/models.py`; the session dependency is `get_db` from `app/database.py`.
- Settings are centralized in `app/config.py` via `pydantic-settings` and read from `.env`.

### Shared types

`packages/shared/src/index.ts` contains the canonical TypeScript types for `Video`, `Clip`, and `Job`. These must stay in sync with `app/models.py` and `app/schemas.py`.

## Testing instructions

- **There are currently no project-level tests.** `pnpm test` runs `turbo run test`, which effectively does nothing because neither `web` nor `shared` define test scripts, and `api` is a Python package without a `package.json`.
- If you add tests:
  - Frontend: use the framework the project already installs (none currently). Jest/Vitest would need to be added as a dev dependency.
  - Backend: add `pytest`, `httpx`, and a test database fixture. Tests should go in an `apps/api/tests/` directory.

## Security considerations

- **Authentication is real Clerk JWT verification.** `app/auth.py::get_current_user` validates the bearer token against Clerk's JWKS (via `CLERK_ISSUER`/`CLERK_PUBLISHABLE_KEY`) and upserts a local `User` row from the token claims. It only falls back to a hard-coded demo user (`demo@example.com`) when `CLERK_VERIFY_TOKENS=false` is explicitly set — that flag must stay `true` (the default) in production.
- **CORS** is configured from `CORS_ORIGINS` in `app/config.py`.
- **Storage** uses presigned URLs for upload and download. The backend never handles raw video bytes over HTTP.
- **Secrets** are read from `.env` files. Never commit `.env`, `.env.local`, or `.env.*.local`. `.env.example` is the checked-in template.
- **FFmpeg** runs on uploaded files in the worker. Treat all input as untrusted and validate file type/size before processing.

## Deployment notes

- The API and worker share the same Dockerfile (`apps/api/Dockerfile`) and use the same Python image with FFmpeg installed.
- For production the README suggests switching from MinIO to Cloudflare R2 or AWS S3 and replacing the demo auth with Clerk JWT verification.
- The `STORAGE_INTERNAL_ENDPOINT` is used by the worker/API for S3 API calls, while `STORAGE_ENDPOINT`/`STORAGE_PUBLIC_URL` are used for presigned/public URLs.

## Common gotchas

- `apps/api` is a Python package and is **not** a pnpm package. Turborepo does not manage Python dependencies.
- The shared package must be rebuilt after type changes before the frontend type-check picks them up.
- If the worker fails to process a video, the Celery task retries up to 3 times with a 60-second countdown and updates the `Job` status to `failed`.
- `Base.metadata.create_all` runs on every API startup; prefer Alembic for schema migrations in production.
