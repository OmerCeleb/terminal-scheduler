from dataclasses import dataclass, field
from typing import Optional

ROLLING_DAYS = 3
HEAVY_THRESHOLD_KG = 10
# KIM-inspired: load is counted in weight classes, not linear kg.
# A heavy package (> HEAVY_THRESHOLD_KG) counts as HEAVY_FACTOR light ones. Calibrate against scanner data.
HEAVY_FACTOR = 3.0


@dataclass
class BandInput:
    id: int
    name: str
    packages: int


@dataclass
class DailyLoad:
    packages: int
    heavy_packages: int = 0


@dataclass
class WorkerInput:
    id: int
    name: str
    role: str = "band"  # "band" | "stod"
    loads: list = field(default_factory=list)  # DailyLoad entries for the rolling window

    @property
    def effort(self) -> Optional[float]:
        """Combined effort over the window; None when the worker has no records at all."""
        if not self.loads:
            return None
        total = 0.0
        for load in self.loads:
            light = max(load.packages - load.heavy_packages, 0)
            total += light + load.heavy_packages * HEAVY_FACTOR
        return total


@dataclass
class AssignmentResult:
    band: BandInput
    worker: WorkerInput
    fatigue_score: float


@dataclass
class ScheduleResult:
    assignments: list
    stod: list  # WorkerInput with role "stod", not assigned to a band
    unassigned: list  # band-role workers left over when there are more workers than bands
    empty_bands: list  # BandInput left without a worker
    fatigue_scores: dict  # worker_id -> score


def compute_fatigue_scores(workers: list) -> dict:
    """
    score = (worker effort / team average effort) * 50
    50 = average load, 100 = twice the average.
    Workers with no records are treated as average.
    """
    efforts = {w.id: w.effort for w in workers}
    known = [e for e in efforts.values() if e is not None]
    avg = sum(known) / len(known) if known else 0.0

    scores = {}
    for wid, effort in efforts.items():
        if effort is None or avg == 0:
            scores[wid] = 50.0
        else:
            scores[wid] = round((effort / avg) * 50, 1)
    return scores


def run_assignment(bands: list, workers: list) -> ScheduleResult:
    scores = compute_fatigue_scores(workers)

    stod = [w for w in workers if w.role == "stod"]
    band_workers = [w for w in workers if w.role != "stod"]

    sorted_bands = sorted(bands, key=lambda b: b.packages, reverse=True)
    sorted_workers = sorted(band_workers, key=lambda w: scores[w.id])

    assignments = []
    for band, worker in zip(sorted_bands, sorted_workers):
        assignments.append(AssignmentResult(band=band, worker=worker, fatigue_score=scores[worker.id]))

    n = len(assignments)
    return ScheduleResult(
        assignments=assignments,
        stod=stod,
        unassigned=sorted_workers[n:],
        empty_bands=sorted_bands[n:],
        fatigue_scores=scores,
    )
