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
        "generate-daily-signal": {
            "task": "generate_daily_signal",
            # 06:00 UTC = 08:00 SAST (SA traders wake up to signals)
            "schedule": 86400.0,  # daily — set crontab when deployed
        },
        "run-agent-pipeline": {
            "task": "run_agent_pipeline",
            "schedule": 300.0,
        },
        "update-portfolio-metrics": {
            "task": "update_portfolio_metrics",
            "schedule": 60.0,
        },
        "generate-daily-digest": {
            "task": "generate_daily_digest",
            "schedule": 86400.0,
        },
        "run-weekly-learning": {
            "task": "run_weekly_learning",
            "schedule": 604800.0,
        },
    },
)

celery_app.autodiscover_tasks(["app.services"])
