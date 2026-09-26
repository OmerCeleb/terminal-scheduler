import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BandBase(BaseModel):
    name: str

class BandCreate(BandBase):
    pass

class BandOut(BandBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime

class BandDailyLoadUpsert(BaseModel):
    date: datetime.date
    packages: int

class BandDailyLoadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    band_id: int
    date: datetime.date
    packages: int


class WorkerBase(BaseModel):
    name: str
    role: str = "band"

class WorkerCreate(WorkerBase):
    pass

class WorkerOut(WorkerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime.datetime

class WorkerDailyLoadUpsert(BaseModel):
    date: datetime.date
    packages_handled: int
    heavy_packages: int = 0
    weight_kg: Optional[float] = None

class WorkerDailyLoadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: datetime.date
    packages_handled: int
    heavy_packages: int
    weight_kg: Optional[float]
    source: str

class WorkerWithFatigue(WorkerOut):
    recent_loads: list[WorkerDailyLoadOut] = []
    fatigue_score: float = 50.0


class ScannerImportRow(BaseModel):
    worker_name: str
    date: datetime.date
    packages: int
    heavy_packages: int = 0
    weight_kg: Optional[float] = None

class ScannerImportResult(BaseModel):
    imported: int
    skipped: list[str]


class ScheduleGenerateRequest(BaseModel):
    date: datetime.date

class AssignmentOut(BaseModel):
    band_id: int
    band_name: str
    band_packages: int
    worker_id: int
    worker_name: str
    fatigue_score: float

class WorkerRef(BaseModel):
    id: int
    name: str
    fatigue_score: float

class BandRef(BaseModel):
    id: int
    name: str
    packages: int

class ScheduleOut(BaseModel):
    id: int
    date: datetime.date
    generated_at: datetime.datetime
    assignments: list[AssignmentOut]
    stod: list[WorkerRef] = []
    unassigned: list[WorkerRef] = []
    empty_bands: list[BandRef] = []
