from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from io import BytesIO

from app.core.database import get_db
from app.models.models import Schedule, ScheduleAssignment, Band, BandDailyLoad, Worker, WorkerDailyLoad
from app.schemas.schemas import ScheduleGenerateRequest, ScheduleOut, AssignmentOut
from app.services.scheduler import run_assignment, BandInput, WorkerInput
from app.services.pdf import generate_schedule_pdf

router = APIRouter()


async def _build_schedule_out(schedule: Schedule, db: AsyncSession) -> ScheduleOut:
    result = await db.execute(
        select(ScheduleAssignment).where(ScheduleAssignment.schedule_id == schedule.id)
    )
    assignments = result.scalars().all()

    assignment_outs = []
    for a in assignments:
        band = await db.get(Band, a.band_id)
        worker = await db.get(Worker, a.worker_id)

        band_load_result = await db.execute(
            select(BandDailyLoad).where(
                and_(BandDailyLoad.band_id == a.band_id, BandDailyLoad.date == schedule.date)
            )
        )
        band_load = band_load_result.scalar_one_or_none()

        assignment_outs.append(AssignmentOut(
            band_id=a.band_id,
            band_name=band.name if band else "?",
            band_packages=band_load.packages if band_load else 0,
            worker_id=a.worker_id,
            worker_name=worker.name if worker else "?",
            fatigue_score=a.fatigue_score,
        ))

    return ScheduleOut(
        id=schedule.id,
        date=schedule.date,
        generated_at=schedule.generated_at,
        assignments=assignment_outs,
    )


@router.post("/generate", response_model=ScheduleOut, status_code=201)
async def generate_schedule(payload: ScheduleGenerateRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Schedule).where(Schedule.date == payload.date))
    existing_schedule = existing.scalar_one_or_none()
    if existing_schedule:
        for a in (await db.execute(
            select(ScheduleAssignment).where(ScheduleAssignment.schedule_id == existing_schedule.id)
        )).scalars().all():
            await db.delete(a)
        await db.delete(existing_schedule)
        await db.commit()

    band_loads_result = await db.execute(
        select(BandDailyLoad).where(BandDailyLoad.date == payload.date)
    )
    band_loads = band_loads_result.scalars().all()
    if not band_loads:
        raise HTTPException(status_code=400, detail="No band loads found for this date")

    bands = []
    for bl in band_loads:
        band = await db.get(Band, bl.band_id)
        if band:
            bands.append(BandInput(id=band.id, name=band.name, packages=bl.packages))

    yesterday = payload.date - timedelta(days=1)
    workers_result = await db.execute(select(Worker).where(Worker.is_active == True))
    workers_db = workers_result.scalars().all()

    workers = []
    for w in workers_db:
        load_result = await db.execute(
            select(WorkerDailyLoad).where(
                and_(WorkerDailyLoad.worker_id == w.id, WorkerDailyLoad.date == yesterday)
            )
        )
        load = load_result.scalar_one_or_none()
        workers.append(WorkerInput(
            id=w.id,
            name=w.name,
            capacity=w.capacity,
            yesterday_packages=load.packages_handled if load else 0,
        ))

    if not workers:
        raise HTTPException(status_code=400, detail="No active workers found")

    assignments = run_assignment(bands, workers)

    schedule = Schedule(date=payload.date)
    db.add(schedule)
    await db.flush()

    for a in assignments:
        db.add(ScheduleAssignment(
            schedule_id=schedule.id,
            band_id=a.band.id,
            worker_id=a.worker.id,
            fatigue_score=a.fatigue_score,
        ))

    await db.commit()
    await db.refresh(schedule)
    return await _build_schedule_out(schedule, db)


@router.get("/{schedule_date}", response_model=ScheduleOut)
async def get_schedule(schedule_date: date, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.date == schedule_date))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return await _build_schedule_out(schedule, db)


@router.get("/{schedule_date}/pdf")
async def download_pdf(schedule_date: date, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.date == schedule_date))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    schedule_out = await _build_schedule_out(schedule, db)
    pdf_bytes = generate_schedule_pdf(schedule_out)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=vardiya-{schedule_date}.pdf"},
    )
