from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class BandBase(BaseModel):
    name: str

class BandCreate(BandBase):
    pass

class BandOut(BandBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class BandDailyLoadUpsert(BaseModel):
    date: date
    packages: int

class BandDailyLoadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    band_id: int
    date: date
    packages: int


class WorkerBase(BaseModel):
    name: str
    capacity: int = 300

class WorkerCreate(WorkerBase):
    pass

class WorkerOut(WorkerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime

class WorkerDailyLoadUpsert(BaseModel):
    date: date
    packages_handled: int

class WorkerWithFatigue(WorkerOut):
    yesterday_packages: int = 0
    fatigue_score: float = 0.0


class ScheduleGenerateRequest(BaseModel):
    date: date

class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    band_id: int
    band_name: str
    band_packages: int
    worker_id: int
    worker_name: str
    fatigue_score: float

class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    generated_at: datetime
    assignments: list[AssignmentOut]
