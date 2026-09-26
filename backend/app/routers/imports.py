from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.models import Worker, WorkerDailyLoad
from app.schemas.schemas import ScannerImportRow, ScannerImportResult

router = APIRouter()


@router.post("/scanner", response_model=ScannerImportResult)
async def import_scanner_data(rows: list[ScannerImportRow], db: AsyncSession = Depends(get_db)):
    """
    Accepts per-worker daily totals as exported from the handheld scanner system.
    Rows are matched to workers by name (case-insensitive); unmatched rows are reported, not created.
    """
    workers = (await db.execute(select(Worker).where(Worker.is_active == True))).scalars().all()
    by_name = {w.name.strip().lower(): w for w in workers}

    imported = 0
    skipped: list[str] = []

    for row in rows:
        worker = by_name.get(row.worker_name.strip().lower())
        if not worker:
            skipped.append(row.worker_name)
            continue

        load = (await db.execute(
            select(WorkerDailyLoad).where(
                and_(WorkerDailyLoad.worker_id == worker.id, WorkerDailyLoad.date == row.date)
            )
        )).scalar_one_or_none()

        if load:
            load.packages_handled = row.packages
            load.heavy_packages = row.heavy_packages
            load.weight_kg = row.weight_kg
            load.source = "scanner"
        else:
            db.add(WorkerDailyLoad(
                worker_id=worker.id, date=row.date,
                packages_handled=row.packages, heavy_packages=row.heavy_packages, weight_kg=row.weight_kg, source="scanner",
            ))
        imported += 1

    await db.commit()
    return ScannerImportResult(imported=imported, skipped=skipped)
