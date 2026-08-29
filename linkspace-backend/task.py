from celery import Celery
import os

redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
celery_app = Celery("linkspace", broker=redis_url, backend=redis_url)

@celery_app.task
def process_vision_session(session_id: str, user_id: str):
    return {"status": "completed", "session_id": session_id}
