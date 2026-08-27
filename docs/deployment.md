# Deployment Guide

This guide covers taking ClipForge from local development to production.

## Overview

ClipForge consists of:

- **Next.js frontend** (`apps/web`) — deployed to Vercel, Netlify, or a Node host.
- **FastAPI backend** (`apps/api`) — deployed as a Docker container.
- **Celery worker** (`apps/api`) — same image as the API, different start command.
- **Postgres** — persistent data.
- **Redis** — Celery broker and result backend.
- **S3-compatible object storage** — MinIO (self-hosted) or Cloudflare R2 / AWS S3.

## 1. Production accounts and services

Before deploying, set up:

- **Clerk** production instance with a custom domain (required for JWTs to work cross-domain).
- **Paddle** live account with live API key, webhook signing secret, and approved checkout domains.
- **Object storage** — Cloudflare R2 or AWS S3 are recommended for production. MinIO is fine for self-hosting.
- **Database and Redis** — managed services are recommended (Railway/Render/Supabase Postgres, Upstash Redis, etc.).

## 2. Required environment variables

Copy `.env.example` to `.env` and fill in every production value. The API now validates required variables on startup and fails loudly if anything is missing.

Key variables:

```bash
ENVIRONMENT=production

# Clerk (production keys)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_ISSUER=https://your-domain.clerk.accounts.dev

# Paddle (live environment)
PADDLE_ENV=live
PADDLE_LIVE_API_KEY=pdl_live_apikey_...
PADDLE_WEBHOOK_SECRET=pdl_nslt_...
PADDLE_PRICE_STARTER_MONTH=pri_...
PADDLE_PRICE_STARTER_YEAR=pri_...
PADDLE_PRICE_PRO_MONTH=pri_...
PADDLE_PRICE_PRO_YEAR=pri_...
PADDLE_PRICE_ADVANCED_MONTH=pri_...
PADDLE_PRICE_ADVANCED_YEAR=pri_...

# AI / processing
OPENAI_API_KEY=sk-...

# Database and Redis
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Object storage (example for R2/S3)
STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_INTERNAL_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_PUBLIC_URL=https://cdn.yourdomain.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET_UPLOADS=uploads
STORAGE_BUCKET_CLIPS=clips
STORAGE_USE_SSL=true

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_PADDLE_ENV=live
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_...

# CORS
CORS_ORIGINS=["https://yourdomain.com"]
```

## 3. Database migrations

In production the API does **not** run `create_all` automatically. Migrations must be applied before the app starts.

The production startup script handles this:

```bash
./scripts/start-api.sh
```

This runs `alembic upgrade head` then starts Uvicorn.

## 4. Deploy with Docker Compose (self-hosted)

On a VPS with Docker and Docker Compose installed:

```bash
cp .env.example .env
# edit .env with production values

docker compose -f infra/docker-compose.prod.yml up -d
```

This starts Postgres, Redis, MinIO, API, and worker.

For HTTPS, put a reverse proxy (Caddy, Nginx, Traefik) in front of the API and MinIO console.

## 5. Deploy to Railway

1. Create a new project.
2. Add a **PostgreSQL** and **Redis** service.
3. Add the API service from `apps/api/Dockerfile.prod`.
   - Set the start command to `./scripts/start-api.sh`.
   - Add all environment variables from `.env`.
4. Add a **worker** service using the same Dockerfile.
   - Set the start command to `./scripts/start-worker.sh`.
5. Deploy the frontend to Vercel and point `NEXT_PUBLIC_API_URL` at the Railway API domain.

## 6. Deploy to Render

1. Create a **PostgreSQL** service and a **Redis** service (or external Redis).
2. Create a **Web Service** for the API:
   - Root directory: `apps/api`
   - Dockerfile path: `Dockerfile.prod`
   - Start command: `./scripts/start-api.sh`
   - Add environment variables.
3. Create a **Background Worker** using the same root directory and Dockerfile:
   - Start command: `./scripts/start-worker.sh`
4. Deploy the frontend to Vercel with `NEXT_PUBLIC_API_URL` set to the Render API URL.

## 7. Paddle webhook

In the Paddle dashboard:

1. Create a notification destination pointing to `https://api.yourdomain.com/api/v1/billing/webhook`.
2. Copy the signing secret into `PADDLE_WEBHOOK_SECRET`.
3. Under **Checkout > Checkout settings**, set the default payment link to your production checkout page.
4. On live, ensure your domain is approved by Paddle before transactions can complete.

## 8. Frontend deployment

Deploy `apps/web` to Vercel:

```bash
pnpm --filter web build
```

Make sure these environment variables are set in Vercel:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_PADDLE_ENV`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`

## 9. Health checks

The API exposes a health endpoint:

```
GET /health
```

Use this for uptime monitoring and load-balancer health checks.

## 10. Going live checklist

- [ ] Clerk production app with custom domain
- [ ] Paddle live account, products, prices, and webhook destination
- [ ] Production `.env` fully populated
- [ ] Database migrations applied
- [ ] Object storage bucket permissions allow public read for clips
- [ ] Frontend deployed with correct `NEXT_PUBLIC_*` variables
- [ ] CORS origins restricted to production domains
- [ ] Paddle checkout domain approved
- [ ] Test a complete upload → process → download flow in production
- [ ] Test a live Paddle checkout (after Paddle verification)
