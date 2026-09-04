from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.models import Band, BandDailyLoad
from app.schemas.schemas import BandCreate, BandOut, BandDailyLoadUpsert, BandDailyLoadOut

router = APIRouter()


@router.get("/", response_model=list[BandOut])
async def get_bands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Band).order_by(Band.created_at))
    return result.scalars().all()


@router.post("/", response_model=BandOut, status_code=201)
async def create_band(payload: BandCreate, db: AsyncSession = Depends(get_db)):
    band = Band(name=payload.name)
    db.add(band)
    await db.commit()
    await db.refresh(band)
    return band


@router.delete("/{band_id}", status_code=204)
async def delete_band(band_id: int, db: AsyncSession = Depends(get_db)):
    band = await db.get(Band, band_id)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    await db.delete(band)
    await db.commit()


@router.put("/{band_id}/load", response_model=BandDailyLoadOut)
async def upsert_band_load(band_id: int, payload: BandDailyLoadUpsert, db: AsyncSession = Depends(get_db)):
    band = await db.get(Band, band_id)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")

    result = await db.execute(
        select(BandDailyLoad).where(
            and_(BandDailyLoad.band_id == band_id, BandDailyLoad.date == payload.date)
        )
    )
    load = result.scalar_one_or_none()

    if load:
        load.packages = payload.packages
    else:
        load = BandDailyLoad(band_id=band_id, date=payload.date, packages=payload.packages)
        db.add(load)

    await db.commit()
    await db.refresh(load)
    return load


@router.get("/{band_id}/load", response_model=list[BandDailyLoadOut])
async def get_band_loads(band_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BandDailyLoad)
        .where(BandDailyLoad.band_id == band_id)
        .order_by(BandDailyLoad.date.desc())
    )
    return result.scalars().all()
