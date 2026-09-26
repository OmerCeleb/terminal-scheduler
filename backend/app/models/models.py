import datetime
from sqlalchemy import Integer, String, Float, Date, DateTime, ForeignKey, Boolean, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Band(Base):
    __tablename__ = "bands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    daily_loads: Mapped[list["BandDailyLoad"]] = relationship(back_populates="band", cascade="all, delete-orphan")


class BandDailyLoad(Base):
    __tablename__ = "band_daily_loads"
    __table_args__ = (UniqueConstraint("band_id", "date", name="uq_band_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    band_id: Mapped[int] = mapped_column(ForeignKey("bands.id", ondelete="CASCADE"))
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    packages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    band: Mapped["Band"] = relationship(back_populates="daily_loads")


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="band")  # "band" | "stod"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())

    daily_loads: Mapped[list["WorkerDailyLoad"]] = relationship(back_populates="worker", cascade="all, delete-orphan")
    assignments: Mapped[list["ScheduleAssignment"]] = relationship(back_populates="worker")


class WorkerDailyLoad(Base):
    __tablename__ = "worker_daily_loads"
    __table_args__ = (UniqueConstraint("worker_id", "date", name="uq_worker_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id", ondelete="CASCADE"))
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    packages_handled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    heavy_packages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # packages over HEAVY_THRESHOLD_KG
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)  # total kg from scanner, informational
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")  # "manual" | "scanner"

    worker: Mapped["Worker"] = relationship(back_populates="daily_loads")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, unique=True)
    generated_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    notes: Mapped[str] = mapped_column(String(500), nullable=True)

    assignments: Mapped[list["ScheduleAssignment"]] = relationship(back_populates="schedule", cascade="all, delete-orphan")


class ScheduleAssignment(Base):
    __tablename__ = "schedule_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id", ondelete="CASCADE"))
    band_id: Mapped[int] = mapped_column(ForeignKey("bands.id"))
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"))
    fatigue_score: Mapped[float] = mapped_column(Float, nullable=False)

    schedule: Mapped["Schedule"] = relationship(back_populates="assignments")
    band: Mapped["Band"] = relationship()
    worker: Mapped["Worker"] = relationship(back_populates="assignments")
