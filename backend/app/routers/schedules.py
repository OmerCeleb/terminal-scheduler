import datetime
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Schedule, ScheduleAssignment, Band, BandDailyLoad, Worker
from app.schemas.schemas import ScheduleGenerateRequest, ScheduleOut, AssignmentOut, WorkerRef, BandRef
from app.services.scheduler import run_assignment, BandInput
from app.services.pdf import generate_band_sheet, generate_shift_report
from app.routers.workers import load_workers_with_window

router = APIRouter()


async def _load_bands(db: AsyncSession, date: datetime.date) -> list[BandInput]:
    rows = (await db.execute(
        select(Band, BandDailyLoad)
        .join(BandDailyLoad, BandDailyLoad.band_id == Band.id)
        .where(BandDailyLoad.date == date)
    )).all()
    return [BandInput(id=b.id, name=b.name, packages=l.packages) for b, l in rows]


async def _build_out(schedule: Schedule, db: AsyncSession) -> ScheduleOut:
    bands = await _load_bands(db, schedule.date)
    _, _, worker_inputs = await load_workers_with_window(db, schedule.date)
    result = run_assignment(bands, worker_inputs)
    scores = result.fatigue_scores

    return ScheduleOut(
        id=schedule.id,
        date=schedule.date,
        generated_at=schedule.generated_at,
        assignments=[
            AssignmentOut(
                band_id=a.band.id, band_name=a.band.name, band_packages=a.band.packages,
                worker_id=a.worker.id, worker_name=a.worker.name, fatigue_score=a.fatigue_score,
            )
            for a in result.assignments
        ],
        stod=[WorkerRef(id=w.id, name=w.name, fatigue_score=scores[w.id]) for w in result.stod],
        unassigned=[WorkerRef(id=w.id, name=w.name, fatigue_score=scores[w.id]) for w in result.unassigned],
        empty_bands=[BandRef(id=b.id, name=b.name, packages=b.packages) for b in result.empty_bands],
    )


@router.post("/generate", response_model=ScheduleOut, status_code=201)
async def generate_schedule(payload: ScheduleGenerateRequest, db: AsyncSession = Depends(get_db)):
    bands = await _load_bands(db, payload.date)
    if not bands:
        raise HTTPException(status_code=400, detail="Inga bandvolymer registrerade för detta datum")

    _, _, worker_inputs = await load_workers_with_window(db, payload.date)
    if not any(w.role == "band" for w in worker_inputs):
        raise HTTPException(status_code=400, detail="Inga aktiva medarbetare")

    result = run_assignment(bands, worker_inputs)

    existing = (await db.execute(select(Schedule).where(Schedule.date == payload.date))).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    schedule = Schedule(date=payload.date)
    db.add(schedule)
    await db.flush()

    for a in result.assignments:
        db.add(ScheduleAssignment(
            schedule_id=schedule.id, band_id=a.band.id, worker_id=a.worker.id, fatigue_score=a.fatigue_score,
        ))

    await db.commit()
    await db.refresh(schedule)
    return await _build_out(schedule, db)


@router.get("/{schedule_date}", response_model=ScheduleOut)
async def get_schedule(schedule_date: datetime.date, db: AsyncSession = Depends(get_db)):
    schedule = (await db.execute(select(Schedule).where(Schedule.date == schedule_date))).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return await _build_out(schedule, db)


async def _get_or_404(db: AsyncSession, schedule_date: datetime.date) -> Schedule:
    schedule = (await db.execute(select(Schedule).where(Schedule.date == schedule_date))).scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


def _pdf_response(pdf_bytes: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.get("/{schedule_date}/pdf/band-sheet")
async def download_band_sheet(schedule_date: datetime.date, db: AsyncSession = Depends(get_db)):
    schedule = await _get_or_404(db, schedule_date)
    return _pdf_response(generate_band_sheet(await _build_out(schedule, db)), f"bandlista-{schedule_date}.pdf")


@router.get("/{schedule_date}/pdf/report")
async def download_shift_report(schedule_date: datetime.date, db: AsyncSession = Depends(get_db)):
    schedule = await _get_or_404(db, schedule_date)
    _, loads_by_worker, _ = await load_workers_with_window(db, schedule.date)
    recent = {wid: [(l.date, l.packages_handled, l.heavy_packages) for l in sorted(loads, key=lambda x: x.date, reverse=True)]
              for wid, loads in loads_by_worker.items()}
    return _pdf_response(generate_shift_report(await _build_out(schedule, db), recent), f"skiftrapport-{schedule_date}.pdf")
