# ClipForge

ClipForge turns long-form video into vertical, short-form clips ready for TikTok, Instagram Reels, and YouTube Shorts. Upload a video and it automatically crops to 9:16, transcribes and burns in styled captions, optionally translates and dubs into another language, and surfaces the most engaging moments as ready-to-post clips.

Live at **[clickforg.com](https://clickforg.com)**.

## Features

- **Auto-crop to vertical** — 16:9 source video cropped to 9:16 for short-form platforms
- **Burned-in captions** — automatic transcription with customizable font, size, color, position, and outline
- **Translate & dub** — multi-language caption translation plus an optional dubbed voice track
- **Smart clip selection** — transcript segments are scored to surface the most engaging moments
- **Caption presets** — save and reuse a named style/language/voice configuration across uploads
- **Credit-based billing** — subscription tiers plus one-time top-up credit packs, billed through Paddle
- **Clip analytics** — view and download counts per clip
- **Admin tools** — waitlist export, opt-in homepage demo clips

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Clerk |
| Backend | FastAPI, SQLAlchemy, Alembic, Celery, Redis |
| Database | PostgreSQL |
| Video processing | FFmpeg, OpenAI Whisper (transcription), OpenAI TTS (voiceover) |
| Object storage | Cloudflare R2 (S3-compatible); MinIO for local dev |
| Billing | Paddle (Merchant of Record) |
| Hosting | Vercel (web), Railway (API + worker + Postgres + Redis) |

## Project Structure

```
klickforge/
├── apps/
│   ├── web/                # Next.js frontend
│   └── api/                # FastAPI backend + Celery worker
├── packages/
│   └── shared/              # Shared TypeScript types
├── docs/
│   └── deployment.md        # Production deployment guide
├── infra/
│   └── docker-compose.yml   # Local Postgres/Redis/MinIO only — not used in production
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+ and pnpm 9+
- Docker and Docker Compose
- Python 3.12 (for running the API outside Docker)

### 1. Install dependencies

```bash
pnpm install
pnpm --filter @youtubers/shared build
```

### 2. Configure environment

Each app reads its own env file — see the comments in each `.env.example` for where to get each value:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Clerk, OpenAI, and Paddle keys are required for full functionality; the app fails loudly on startup if a required variable is missing rather than degrading silently.

### 3. Start local infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL, Redis, MinIO (local S3-compatible storage), the API server, and the Celery worker.

### 4. Run the frontend

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run database migrations

```bash
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

### MinIO console (local object storage)

- Console: [http://localhost:9001](http://localhost:9001)
- Credentials: `minioadmin` / `minioadmin`

## Testing

```bash
# Backend (pytest)
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest

# Frontend (vitest)
pnpm test
```

`apps/api` is a plain Python project, not a pnpm workspace member, so backend tests always run separately from `pnpm test` (which only covers the frontend, via Turborepo).

## Development Commands

```bash
pnpm dev      # run the frontend dev server (Turborepo)
pnpm build    # build the frontend and shared package
pnpm lint     # lint the frontend
pnpm test     # test the frontend
```

These commands (via Turborepo) only cover the JS workspaces — `apps/web` and `packages/shared`. The Python API and Celery worker (`apps/api`) are started separately: via `docker compose` locally (see [Local Development](#local-development) above), or directly with `uvicorn`/`celery` when developing outside Docker.

## API Overview

The backend exposes a versioned REST API under `/api/v1`, grouped by resource:

| Prefix | Covers |
|---|---|
| `/api/v1/videos` | Upload, processing, retry, transcript editing |
| `/api/v1/clips` | Clip listing, download, view tracking, regeneration |
| `/api/v1/jobs` | Async job status polling |
| `/api/v1/presets` | Saved caption/style presets |
| `/api/v1/billing` | Subscriptions, customer portal, credit packs, Paddle webhooks |
| `/api/v1/users` | Current user profile and activity |
| `/api/v1/waitlist` | Waitlist signup and admin export |
| `/api/v1/public` | Public, unauthenticated endpoints (e.g. opt-in demo clips) |
| `/health` | Health check (database + Redis) |

Interactive docs are available at `/docs` (FastAPI/Swagger) on the API server.

## Deployment

Production deployment (Railway + Vercel + Cloudflare R2 + Paddle) is documented in [`docs/deployment.md`](docs/deployment.md).

## License

Private — all rights reserved.
