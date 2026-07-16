from celery import Celery
from celery.schedules import crontab
from kombu import Queue
from app.config import REDIS_URL

# In production, use the REDIS_URL from environment variables
celery = Celery(
    "ecommerce_tasks",
    broker=REDIS_URL or "redis://localhost:6379/0",
    backend=REDIS_URL or "redis://localhost:6379/0",
    include=["app.tasks.order_tasks"],
)

# Celery Configuration Options
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3000,  # Soft limit to let task handle cleanup before hard limit
    worker_concurrency=4,  # Adjust based on CPU cores
    worker_prefetch_multiplier=1,  # One task per worker at a time to prevent hogging
    result_expires=86400,  # Results expire after 24 hours
    broker_pool_limit=10,  # Reuse connection pools
    broker_connection_retry_on_startup=True,
)

# Define Queues for priority task routing
celery.conf.task_queues = (
    Queue("high_priority", routing_key="high_priority"),
    Queue("default", routing_key="default"),
    Queue("low_priority", routing_key="low_priority"),
)

celery.conf.task_default_queue = "default"

# Route tasks to specific queues to prevent starvation
celery.conf.task_routes = {
    "app.tasks.order_tasks.send_order_confirmation_email": {
        "queue": "high_priority",
    },
    "app.tasks.order_tasks.generate_invoice_task": {
        "queue": "default",
    },
    "app.tasks.order_tasks.bulk_import_products_task": {
        "queue": "low_priority",
    },
}

# Phase 8: Scheduled Tasks (Celery Beat)
celery.conf.beat_schedule = {
    "cleanup-abandoned-carts-every-midnight": {
        "task": "app.tasks.order_tasks.cleanup_abandoned_carts",
        "schedule": crontab(hour=0, minute=0),  # Runs every night at midnight
    },
}
