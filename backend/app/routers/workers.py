from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.models import Worker, WorkerDailyLoad
from app.schemas.schemas import WorkerCreate, WorkerOut, WorkerDailyLoadUpsert, WorkerWithFatigue

router = APIRouter()


@router.get("/", response_model=list[WorkerWithFatigue])
async def get_workers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Worker).where(Worker.is_active == True).order_by(Worker.created_at)
    )
    workers = result.scalars().all()

    yesterday = date.today() - timedelta(days=1)
    output = []
    for w in workers:
        load_result = await db.execute(
            select(WorkerDailyLoad).where(
                and_(WorkerDailyLoad.worker_id == w.id, WorkerDailyLoad.date == yesterday)
            )
        )
        load = load_result.scalar_one_or_none()
        yesterday_packages = load.packages_handled if load else 0
        fatigue_score = round((yesterday_packages / w.capacity) * 100, 1) if w.capacity > 0 else 0.0

        output.append(WorkerWithFatigue(
            id=w.id,
            name=w.name,
            capacity=w.capacity,
            is_active=w.is_active,
            created_at=w.created_at,
            yesterday_packages=yesterday_packages,
            fatigue_score=fatigue_score,
        ))
    return output


@router.post("/", response_model=WorkerOut, status_code=201)
async def create_worker(payload: WorkerCreate, db: AsyncSession = Depends(get_db)):
    worker = Worker(name=payload.name, capacity=payload.capacity)
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


@router.patch("/{worker_id}", response_model=WorkerOut)
async def update_worker(worker_id: int, payload: WorkerCreate, db: AsyncSession = Depends(get_db)):
    worker = await db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker.name = payload.name
    worker.capacity = payload.capacity
    await db.commit()
    await db.refresh(worker)
    return worker


@router.delete("/{worker_id}", status_code=204)
async def delete_worker(worker_id: int, db: AsyncSession = Depends(get_db)):
    worker = await db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    worker.is_active = False
    await db.commit()


@router.put("/{worker_id}/load", response_model=dict)
async def upsert_worker_load(worker_id: int, payload: WorkerDailyLoadUpsert, db: AsyncSession = Depends(get_db)):
    worker = await db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    result = await db.execute(
        select(WorkerDailyLoad).where(
            and_(WorkerDailyLoad.worker_id == worker_id, WorkerDailyLoad.date == payload.date)
        )
    )
    load = result.scalar_one_or_none()

    if load:
        load.packages_handled = payload.packages_handled
    else:
        load = WorkerDailyLoad(worker_id=worker_id, date=payload.date, packages_handled=payload.packages_handled)
        db.add(load)

    await db.commit()
    return {"status": "ok"}
