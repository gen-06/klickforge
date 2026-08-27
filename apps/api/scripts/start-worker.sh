#!/usr/bin/env bash
set -e

echo "Starting Celery worker..."
exec celery -A app.worker.celery_app worker -l info -c "${CELERY_CONCURRENCY:-1}"
