# Terminal Scheduler

A shift-assignment tool for parcel sorting terminals. It distributes workers across conveyor bands based on how hard each person worked the previous day, so the heaviest bands go to the least fatigued staff.

Built as a personal project, from a problem I ran into working night shifts at a logistics terminal: band assignments were made by hand every morning, and nothing tracked who had been hammered the day before.

## The problem

A sorting terminal has several conveyor bands. Each band gets a different parcel volume on any given day — one might handle 1,250 parcels while another handles 400. Supervisors assign staff to bands at the start of the shift, usually from memory and habit.

Two things go wrong with that:

- Nobody tracks cumulative load. The same people end up on the heavy bands repeatedly.
- Assignments are made on a phone, standing on the floor, in about two minutes. There is no time to work anything out on paper.

This tool takes the day's forecast per band, looks at yesterday's actual load per worker, and proposes an assignment.

## Fatigue score

The core metric is deliberately simple, because it has to be explainable to a supervisor in one sentence:

```
fatigue_score = (yesterday_packages / worker_capacity) * 100
```

Bands are sorted by parcel volume, workers are sorted by fatigue score, and the freshest workers are matched to the heaviest bands.

The score is stored on each assignment rather than recalculated on read. Yesterday's figures can be corrected after the fact, and a schedule should show the numbers it was actually generated from.

## Stack

**Backend** — FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, JWT auth, ReportLab for PDF export

**Frontend** — Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, Framer Motion

**Infrastructure** — Docker Compose for the database

The UI is in Swedish and built mobile-first, because supervisors use it on a phone while walking the floor.

## Running it locally

Requires Docker, Python 3.9+, and Node 18+.

### Database

```bash
cd backend
docker compose up -d db
docker compose ps          # wait for "healthy"
```

### Backend

```bash
cd backend
cp .env.example .env       # edit ADMIN_PASSWORD and SECRET_KEY
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tables are created on startup. API docs are at `http://localhost:8000/api/docs`.

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000` and log in with the credentials from your `.env`.

### Trying it out

1. Add a few bands under **Band**
2. Add workers with different capacities under **Personal**
3. Enter yesterday's parcel count for each worker
4. Enter today's forecast per band
5. Generate the schedule under **Schema**

Workers with the lowest fatigue score should land on the highest-volume bands. A PDF of the schedule can be downloaded from the same screen.

## Known limitations

This is an MVP and the gaps below are known rather than overlooked. They are roughly in priority order.

**Capacity is not enforced.** `capacity` is only used as the denominator of the fatigue score. Nothing checks whether the workers assigned to a band can actually handle its volume, so the system will happily assign one person with a capacity of 300 to a band with 5,000 parcels and report no problem. Headcount per band is the main missing piece.

**Regeneration can lose data.** Generating a schedule for a date that already has one deletes the existing schedule and commits before validating the new inputs. If the band load records are missing, the old schedule is gone and nothing replaces it.

**Missing load records are read as zero fatigue.** A worker with no record for yesterday is treated as fully rested, so someone whose data was simply never entered gets sent to the heaviest band. Absent, untracked, and newly hired are three different situations that currently look identical.

**No uniqueness constraint on daily loads.** `(band_id, date)` and `(worker_id, date)` are not unique, so duplicate rows are possible. The query path uses `scalar_one_or_none()`, which raises rather than returning `None` when it finds more than one row.

**Schedule endpoints are unauthenticated.** JWT auth exists and the login flow works, but the schedule routes do not depend on it. That includes the PDF export, which contains staff names.

**No manual override.** There is no endpoint to change an assignment after generation, and generation writes directly rather than proposing first. A supervisor cannot adjust the result, which is a real obstacle to floor adoption.

**Bands can be left empty silently.** If there are fewer workers than bands, some bands get nobody and the response says nothing about it.

**No migrations.** Tables are created with `create_all` on startup, so schema changes will not propagate to an existing database. Alembic is installed but not initialised.

**N+1 queries.** Building a schedule response issues separate queries per assignment. Fine at current scale, noticeable on a larger roster.

## Roadmap

- Headcount calculation per band, with a warning when total capacity is short of total volume
- Distinguish absent / no data / new hire instead of defaulting to zero fatigue
- Auth on all endpoints
- Preview-then-confirm flow with manual override
- Multi-shift support (currently one schedule per date)
- Alembic migrations
