import logging
from celery import Celery
from celery.signals import task_failure, worker_process_init

from app.config import settings, validate_settings

logger = logging.getLogger("clipforge.worker")

print(f"[celery_app] broker URL: {settings.REDIS_URL}")

celery_app = Celery("youtubers", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    # Global retry/backoff defaults; individual tasks can override.
    task_default_retry_delay=30,
    task_max_retries=3,
    # Keep results for 1 hour so the dashboard can poll job progress.
    result_expires=3600,
    imports=["app.worker.tasks"],
)


@worker_process_init.connect
def validate_worker_settings(**kwargs):
    """Fail fast at worker boot instead of mid-task, after credits may
    already have been deducted for a job."""
    validate_settings()


@task_failure.connect
def log_task_failure(sender=None, task_id=None, exception=None, args=None, kwargs=None, **extra):
    """Log all terminal task failures for monitoring."""
    logger.exception(
        "task.failed",
        extra={
            "task_name": sender.name if sender else None,
            "task_id": task_id,
            "args": args,
            "kwargs": kwargs,
            "error": str(exception),
        },
    )
