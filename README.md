# ClipForge

SaaS platform for converting long-form YouTube videos into vertical short-form clips for TikTok, Reels, and YouTube Shorts.

## Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS + Clerk auth
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL + Celery + Redis
- **Video processing:** FFmpeg
- **Object storage:** MinIO (local) / Cloudflare R2 (production)
- **Deployment:** Docker Compose locally; Railway/Render for production

## Project Structure

```
youtubers/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # FastAPI backend + Celery worker
├── packages/
│   └── shared/           # Shared TypeScript types
├── infra/
│   └── docker-compose.yml
└── README.md
```

## Quick Start

### 1. Prerequisites

- Node.js 20+ and pnpm 9+
- Docker and Docker Compose
- Python 3.12 (for local backend development)

### 2. Install dependencies

```bash
pnpm install
pnpm --filter @youtubers/shared build
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and add your Clerk keys (optional for local demo mode)
```

### 4. Start the local stack

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL, Redis, MinIO, the API server, and the Celery worker.

### 5. Run the frontend

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000).

In local demo mode, the backend automatically creates and uses a demo user so you can test uploads without Clerk keys.

### 6. Access MinIO console

- Console: [http://localhost:9001](http://localhost:9001)
- Credentials: `minioadmin` / `minioadmin`

## API Endpoints

- `GET /health` — health check
- `POST /api/v1/videos/presigned-upload` — get a presigned upload URL
- `POST /api/v1/videos` — register a new video
- `POST /api/v1/videos/{id}/complete` — mark upload complete and start processing
- `GET /api/v1/videos` — list videos
- `GET /api/v1/videos/{id}/clips` — list clips for a video
- `GET /api/v1/jobs/{id}` — get job status
- `GET /api/v1/clips/{id}/download` — get signed clip download URL

## Development Commands

```bash
# Run all dev servers
pnpm dev

# Build everything
pnpm build

# Lint
pnpm lint

# Backend migrations (inside API container)
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

## Production Notes

- Replace the demo auth in `apps/api/app/routers/videos.py` with Clerk JWT verification.
- Switch MinIO config to Cloudflare R2 or AWS S3.
- Run Celery workers on larger CPU instances for video transcoding.
- Add Sentry, monitoring, and CI/CD pipelines.

## License

Private — all rights reserved.
