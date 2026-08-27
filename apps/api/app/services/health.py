"""Health check helpers for the API stack."""

import logging

import redis
from sqlalchemy import text

from app.database import engine
from app.worker.celery_app import celery_app

logger = logging.getLogger("clipforge.health")


def check_database() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("health.database_failed")
        return {"status": "error", "detail": str(exc)}


def check_redis() -> dict:
    try:
        broker_url = celery_app.conf.broker_url
        client = redis.Redis.from_url(str(broker_url), socket_connect_timeout=2)
        client.ping()
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("health.redis_failed")
        return {"status": "error", "detail": str(exc)}


def run_health_checks() -> dict:
    db = check_database()
    redis_check = check_redis()
    healthy = db["status"] == "ok" and redis_check["status"] == "ok"

    return {
        "status": "healthy" if healthy else "unhealthy",
        "checks": {
            "database": db,
            "redis": redis_check,
        },
    }
