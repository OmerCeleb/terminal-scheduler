from dataclasses import dataclass


@dataclass
class BandInput:
    id: int
    name: str
    packages: int


@dataclass
class WorkerInput:
    id: int
    name: str
    capacity: int
    yesterday_packages: int

    @property
    def fatigue_score(self) -> float:
        if self.capacity <= 0:
            return 100.0
        return round((self.yesterday_packages / self.capacity) * 100, 1)


@dataclass
class AssignmentResult:
    band: BandInput
    worker: WorkerInput
    fatigue_score: float


def run_assignment(bands: list[BandInput], workers: list[WorkerInput]) -> list[AssignmentResult]:
    if not bands or not workers:
        return []

    sorted_bands = sorted(bands, key=lambda b: b.packages, reverse=True)
    sorted_workers = sorted(workers, key=lambda w: w.fatigue_score)

    workers_per_band = max(1, len(sorted_workers) // len(sorted_bands))
    extra = len(sorted_workers) - workers_per_band * len(sorted_bands)

    results: list[AssignmentResult] = []
    wi = 0

    for bi, band in enumerate(sorted_bands):
        count = workers_per_band + (1 if bi < extra else 0)
        for _ in range(count):
            if wi >= len(sorted_workers):
                break
            worker = sorted_workers[wi]
            results.append(AssignmentResult(
                band=band,
                worker=worker,
                fatigue_score=worker.fatigue_score,
            ))
            wi += 1

    for i, worker in enumerate(sorted_workers[wi:]):
        results.append(AssignmentResult(
            band=sorted_bands[i % len(sorted_bands)],
            worker=worker,
            fatigue_score=worker.fatigue_score,
        ))

    return results
