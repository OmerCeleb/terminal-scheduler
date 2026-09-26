import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.models import Worker, WorkerDailyLoad
from app.schemas.schemas import WorkerCreate, WorkerOut, WorkerDailyLoadUpsert, WorkerWithFatigue, WorkerDailyLoadOut
from app.services.scheduler import WorkerInput, DailyLoad, compute_fatigue_scores, ROLLING_DAYS

router = APIRouter()


async def load_workers_with_window(db: AsyncSession, reference_date: datetime.date):
    """Active workers plus their loads in the rolling window ending the day before reference_date."""
    window_start = reference_date - datetime.timedelta(days=ROLLING_DAYS)
    window_end = reference_date - datetime.timedelta(days=1)

    workers = (await db.execute(
        select(Worker).where(Worker.is_active == True).order_by(Worker.created_at)
    )).scalars().all()

    loads = (await db.execute(
        select(WorkerDailyLoad).where(
            and_(WorkerDailyLoad.date >= window_start, WorkerDailyLoad.date <= window_end)
        ).order_by(WorkerDailyLoad.date.desc())
    )).scalars().all()

    loads_by_worker: dict = {}
    for l in loads:
        loads_by_worker.setdefault(l.worker_id, []).append(l)

    inputs = [
        WorkerInput(
            id=w.id,
            name=w.name,
            role=w.role,
            loads=[DailyLoad(packages=l.packages_handled, heavy_packages=l.heavy_packages) for l in loads_by_worker.get(w.id, [])],
        )
        for w in workers
    ]
    return workers, loads_by_worker, inputs


@router.get("/", response_model=list[WorkerWithFatigue])
async def get_workers(db: AsyncSession = Depends(get_db)):
    workers, loads_by_worker, inputs = await load_workers_with_window(db, datetime.date.today())
    scores = compute_fatigue_scores(inputs)

    return [
        WorkerWithFatigue(
            id=w.id,
            name=w.name,
            role=w.role,
            is_active=w.is_active,
            created_at=w.created_at,
            recent_loads=[WorkerDailyLoadOut.model_validate(l) for l in loads_by_worker.get(w.id, [])],
            fatigue_score=scores[w.id],
        )
        for w in workers
    ]


@router.post("/", response_model=WorkerOut, status_code=201)
async def create_worker(payload: WorkerCreate, db: AsyncSession = Depends(get_db)):
    if payload.role not in ("band", "stod"):
        raise HTTPException(status_code=400, detail="role must be 'band' or 'stod'")
    worker = Worker(name=payload.name, role=payload.role)
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return worker


@router.patch("/{worker_id}", response_model=WorkerOut)
async def update_worker(worker_id: int, payload: WorkerCreate, db: AsyncSession = Depends(get_db)):
    worker = await db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if payload.role not in ("band", "stod"):
        raise HTTPException(status_code=400, detail="role must be 'band' or 'stod'")
    worker.name = payload.name
    worker.role = payload.role
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


@router.put("/{worker_id}/load", response_model=WorkerDailyLoadOut)
async def upsert_worker_load(worker_id: int, payload: WorkerDailyLoadUpsert, db: AsyncSession = Depends(get_db)):
    worker = await db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    load = (await db.execute(
        select(WorkerDailyLoad).where(
            and_(WorkerDailyLoad.worker_id == worker_id, WorkerDailyLoad.date == payload.date)
        )
    )).scalar_one_or_none()

    if load:
        load.packages_handled = payload.packages_handled
        load.heavy_packages = payload.heavy_packages
        load.weight_kg = payload.weight_kg
        load.source = "manual"
    else:
        load = WorkerDailyLoad(
            worker_id=worker_id,
            date=payload.date,
            packages_handled=payload.packages_handled,
            heavy_packages=payload.heavy_packages,
            weight_kg=payload.weight_kg,
            source="manual",
        )
        db.add(load)

    await db.commit()
    await db.refresh(load)
    return load
