import { defineRailway, github, project, postgres, preserve, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "sfo" });
  Postgres.networking = { privateNetworkEndpoint: "postgres", tcpProxies: { "5432": {} } };
  const Redis = redis("Redis", { region: "sfo" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  Redis.networking = { privateNetworkEndpoint: "redis", tcpProxies: { "6379": {} } };
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "sfo", sizeMB: 500 });

  // Non-secret config shared by both the API and the Celery worker (they
  // both call validate_settings() at boot, which requires the full set).
  // Actual credentials (API keys, DB/Storage secrets, webhook signing
  // secret) are intentionally NOT here — they're set via `railway variable
  // set` directly on Railway so they never land in source control.
  const sharedVars = {
    DATABASE_URL: Postgres.env.DATABASE_URL,
    REDIS_URL: Redis.env.REDIS_URL,
    ENVIRONMENT: "production",
    // TODO: drop the vercel.app origin once clickforg.com DNS/custom domain
    // is live and the web app is reachable at its real domain.
    CORS_ORIGINS: '["https://clickforg.com","https://www.clickforg.com","https://web-lime-psi-97.vercel.app"]',
    CLERK_PUBLISHABLE_KEY: "pk_test_b3B0aW11bS11bmljb3JuLTE4NDQuY2xlcmsuYWNjb3VudHMuZGV2JA",
    CLERK_ISSUER: "https://optimum-unicorn-1844.clerk.accounts.dev",
    CLERK_VERIFY_TOKENS: "true",
    ADMIN_EMAILS: "you@example.com",
    PADDLE_ENV: "sandbox",
    PADDLE_PRICE_STARTER_MONTH: "pri_01m1tgjkp81z89w0qm8g15xvzp",
    PADDLE_PRICE_STARTER_YEAR: "pri_01m1tgjkzc3tvrjqrh3hbsfw4b",
    PADDLE_PRICE_PRO_MONTH: "pri_01m1tgjn6cbpp4rkmqt0tzeeax",
    PADDLE_PRICE_PRO_YEAR: "pri_01m1tgjnf7p8axrjgk2sjtbstw",
    PADDLE_PRICE_ADVANCED_MONTH: "pri_01m1tgjp0k822dtdtp24d97eja",
    PADDLE_PRICE_ADVANCED_YEAR: "pri_01m1tgjpab7xcts3zf7hbcn607",
    STORAGE_REGION: "auto",
    STORAGE_BUCKET_UPLOADS: "uploads",
    STORAGE_BUCKET_CLIPS: "clickforge",
    STORAGE_PUBLIC_URL: "https://pub-477319cb27934ef7a834957ff780e6fb.r2.dev",
    STORAGE_USE_SSL: "true",
    MAX_UPLOAD_SIZE_MB: "2048",
    CLIP_MIN_DURATION_SECONDS: "30",
    CLIP_MAX_DURATION_SECONDS: "90",
    CLIP_TARGET_COUNT: "5",

    // Real secrets — set directly on Railway via `railway variable set`,
    // never written to source. preserve() tells `config apply` to leave
    // whatever value is already there alone; omitting a variable entirely
    // (rather than marking it preserve()) would make apply DELETE it.
    CLERK_SECRET_KEY: preserve(),
    OPENAI_API_KEY: preserve(),
    PADDLE_SANDBOX_API_KEY: preserve(),
    PADDLE_LIVE_API_KEY: preserve(),
    PADDLE_WEBHOOK_SECRET: preserve(),
    STORAGE_ENDPOINT: preserve(),
    STORAGE_INTERNAL_ENDPOINT: preserve(),
    STORAGE_ACCESS_KEY: preserve(),
    STORAGE_SECRET_KEY: preserve(),
  };

  const apiSource = github("gen-06/klickforge", { rootDirectory: "apps/api" });

  // Note: the Builder enum has no "DOCKERFILE" value — Railway auto-detects
  // Docker builds from dockerfilePath being set, so `builder` is left unset.
  const api = service("api", {
    source: apiSource,
    build: { dockerfilePath: "Dockerfile" },
    // Must be a single string per array element (the shell command), not
    // one token per element — Railway's API rejects the latter.
    deploy: { preDeployCommand: ["alembic upgrade head"] },
    variables: sharedVars,
  });

  const worker = service("worker", {
    source: apiSource,
    build: { dockerfilePath: "Dockerfile" },
    // --concurrency=2: celery's default autodetect (48, matching the host's
    // reported CPU count) wildly overshoots what a trial-tier container's
    // memory can hold — it crash-looped (OOM) at the default before this.
    deploy: { startCommand: "celery -A app.worker.celery_app worker --loglevel=info --concurrency=2" },
    variables: sharedVars,
  });

  return project("clickforg", {
    resources: [Postgres, Redis, redisVolume, postgresVolume, api, worker],
  });
});
