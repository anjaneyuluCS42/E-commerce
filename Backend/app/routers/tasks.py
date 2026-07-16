from fastapi import APIRouter, HTTPException, Depends
from app.tasks.celery_worker import celery
from celery.result import AsyncResult
from pydantic import BaseModel
from typing import Any, Optional
from app.auth.oauth2 import get_current_user
from app.cache.redis_client import redis_client

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Any] = None
    error: Optional[str] = None
    progress: Optional[int] = 0
    meta: Optional[Any] = None


class TestTaskRequest(BaseModel):
    name: str


async def check_task_ownership(task_id: str, current_user):
    """
    Helper function to check if the current user is the owner of the task or an admin.
    """
    owner_id_str = await redis_client.get(f"task_owner:{task_id}")
    if owner_id_str:
        if int(owner_id_str) != current_user.id and current_user.role != "admin":
            raise HTTPException(
                status_code=403, detail="Not authorized to access this task"
            )
    else:
        # Fallback: if no ownership record exists (e.g. legacy task), only allow admin
        if current_user.role != "admin":
            raise HTTPException(
                status_code=403, detail="Access denied. Task owner unknown."
            )


@router.post("/test-hello", response_model=dict)
async def trigger_hello_task(
    request: TestTaskRequest, current_user=Depends(get_current_user)
):
    from app.tasks.order_tasks import test_hello_world

    task = test_hello_world.delay(request.name)
    # Store task ownership in Redis for 24 hours
    await redis_client.set(f"task_owner:{task.id}", current_user.id, ex=86400)
    return {"task_id": task.id, "status": "QUEUED"}


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, current_user=Depends(get_current_user)):
    await check_task_ownership(task_id, current_user)

    res = AsyncResult(task_id, app=celery)
    response = {
        "task_id": task_id,
        "status": res.status,
        "result": None,
        "error": None,
        "progress": 0,
        "meta": None,
    }

    if res.status in ("PROGRESS", "PROCESSING"):
        if isinstance(res.info, dict):
            response["progress"] = res.info.get("progress", 50)
            response["meta"] = res.info

    if res.ready():
        if res.successful():
            response["result"] = res.result
            response["progress"] = 100
            if isinstance(res.result, dict):
                response["meta"] = res.result
        else:
            response["error"] = str(res.result)

    return response


@router.get("/{task_id}/result")
async def get_task_result(task_id: str, current_user=Depends(get_current_user)):
    await check_task_ownership(task_id, current_user)

    res = AsyncResult(task_id, app=celery)
    if not res.ready():
        raise HTTPException(status_code=400, detail="Task is not completed yet.")

    if res.successful():
        return {"task_id": task_id, "result": res.result}
    else:
        raise HTTPException(status_code=500, detail=f"Task failed: {str(res.result)}")


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str, current_user=Depends(get_current_user)):
    await check_task_ownership(task_id, current_user)

    # Revoke task: if it's already running, terminate it
    celery.control.revoke(task_id, terminate=True, signal="SIGTERM")
    return {"task_id": task_id, "status": "REVOKED"}
