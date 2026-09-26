# Terminal Scheduler

Fair conveyor-band assignment for parcel terminal shifts, based on each worker's actual load over the last three days.

Built by a night-shift terminal worker to solve a problem lived every shift: the supervisor assigns bands by hand, the same people end up on the heaviest bands night after night, and nobody can show why.

**Status:** working MVP, manual data entry, internal prototype. Not connected to any PostNord system.

---

## The problem

Before every shift the supervisor has a per-band package forecast. Assigning people to bands is done by hand and memory. Load is uneven: a worker who cleared 2 400 packages last night can land on the heaviest band again today. That produces two things a terminal cannot afford — staff who feel the schedule is unfair, and physical load that is never measured per person.

Swedish regulation (AFS 2023:10, belastningsergonomi) does not set a maximum weight, but requires the employer to assess *how heavy, how often, for how long* each worker is loaded, and to prevent "unnecessarily tiring" work. Arbetsmiljöverket's own method (KIM) scores load in weight classes, not linear kilograms.

This tool does that assessment continuously and uses it to distribute work.

## What it does

1. Supervisor enters tonight's forecast per band (from the volume report — quick numeric entry, one band after another).
2. Supervisor confirms who is working tonight; each person's last three shifts are already on record.
3. The app computes a **load score per worker** and assigns the heaviest bands to the most rested people. One person per band; *stöd* (float) workers are listed separately.
4. Two PDFs: a **band sheet** for the wall (band → name, no personal data) and a **shift report** for the supervisor (scores, history, fairness index, warnings).

## Load model

effort(worker) = Σ over last 3 shifts of light_packages + HEAVY_FACTOR × heavy_packages
score(worker) = effort / team_average_effort × 50


- **50 = team average.** Under 50 is *rested*, over 70 is *loaded*.
- **Heavy package** = over 10 kg. Counted with `HEAVY_FACTOR = 3` — KIM-inspired weight classes rather than total kilograms, because 100 light bags do not tire like 5 heavy boxes. To be calibrated against scanner data.
- **No history = average.** A new worker or someone back from leave gets 50, not 0.
- **Team-relative, not capacity-based.** The goal is fairness over time, not a fixed daily quota.

Assignment is deterministic: bands sorted by volume descending, band-role workers sorted by score ascending, zipped. Surplus workers and empty bands are reported, never silently dropped.

## Scanner integration (open door)

PostNord scanners are moving to individual logins to track packages and weight per person — exactly the input this model needs. `POST /api/imports/scanner` accepts per-worker daily totals (`worker_name, date, packages, heavy_packages, weight_kg`) and writes them into the same table manual entry uses, tagged `source: "scanner"`. Once an export or API is available, manual entry becomes optional and nothing else changes.

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), PostgreSQL, ReportLab. JWT auth, single admin user from `.env`.
- **Frontend:** Next.js 16 (App Router), Tailwind 4, Framer Motion. Mobile-first, Swedish UI, light/dark via system setting.
- **Infra:** Docker Compose for Postgres. Backend and frontend run locally in development.

## Run it

```bash
# 1. database
cd backend && cp .env.example .env   # set ADMIN_USERNAME / ADMIN_PASSWORD
docker compose up -d

# 2. backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. frontend (new terminal)
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev

# 4. demo data (optional, with the API running)
cd backend && python seed.py
```

Open `http://localhost:3000`. API docs at `http://localhost:8000/api/docs`.

To test on a phone: run the frontend with `npm run dev -- -H 0.0.0.0`, set `NEXT_PUBLIC_API_URL` to your machine's LAN IP, and add that origin to `CORS_ORIGINS` in `backend/app/main.py`.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | JWT login (form: username, password) |
| GET/POST/DELETE | `/api/bands/` | Bands |
| PUT | `/api/bands/{id}/load` | Package forecast for a date |
| GET/POST/PATCH/DELETE | `/api/workers/` | Workers with `role: band \| stod`; GET includes 3-day history and score |
| PUT | `/api/workers/{id}/load` | Packages + heavy packages for a date |
| POST | `/api/imports/scanner` | Bulk import of per-worker daily totals |
| POST | `/api/schedules/generate` | Generate (or regenerate) a schedule for a date |
| GET | `/api/schedules/{date}` | Schedule with assignments, stöd, unassigned, empty bands |
| GET | `/api/schedules/{date}/pdf/band-sheet` | Wall sheet PDF |
| GET | `/api/schedules/{date}/pdf/report` | Supervisor report PDF |

## Known limitations

- Single hardcoded admin user; schedule and import endpoints are not yet behind auth.
- No absence handling (sick leave, vacation) — a worker is either active or deactivated.
- No manual override of a generated schedule; regenerate only.
- `HEAVY_FACTOR` and the 3-day window are assumptions, not calibrated values.
- No database migrations (tables are created on startup; schema changes require a reset).
- Python 3.9 compatibility constraints; `middleware.ts` uses a deprecated Next.js pattern.

## Roadmap

- Absence and partial-shift handling
- Manual override with audit trail
- Camera-based entry of the volume report (OCR)
- Calibrate the load model against real scanner data
- Multi-user accounts per supervisor
