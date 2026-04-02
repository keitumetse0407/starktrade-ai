"""Celery application configuration."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "starktrade",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    beat_schedule={
        "run-agent-pipeline": {
            "task": "run_agent_pipeline",
            "schedule": 300.0,  # every 5 minutes during market hours
        },
        "update-portfolio-metrics": {
            "task": "update_portfolio_metrics",
            "schedule": 60.0,
        },
        "generate-daily-digest": {
            "task": "generate_daily_digest",
            "schedule": 86400.0,  # daily
        },
        "run-weekly-learning": {
            "task": "run_weekly_learning",
            "schedule": 604800.0,  # weekly
        },
    },
)

celery_app.autodiscover_tasks(["app.services"])
