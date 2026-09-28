"""
Demo seed: one realistic night shift with 3 days of history.
Run with the API up:  python seed.py [--base http://localhost:8000]
"""
import sys
import random
import datetime as dt
import urllib.request
import json

BASE = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "http://localhost:8000"
random.seed(7)

def call(method, path, body=None):
    req = urllib.request.Request(f"{BASE}/api{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b"null")

today = dt.date.today()
days = [today - dt.timedelta(days=i) for i in (1, 2, 3)]

BANDS = {"12": 2450, "14": 1980, "15": 2210, "18": 1320, "21": 1640, "23": 890, "27": 1750, "31": 1100}
WORKERS = [
    ("Erik Lund", "band", [2300, 2400, 2100]),      # heavy three nights running
    ("Sara Nyström", "band", [900, 1100, 1000]),
    ("Ali Rahimi", "band", [2200, 2350, 900]),      # heavy last two nights
    ("Maria Ek", "band", [1300, 1250, 1400]),
    ("Jonas Berg", "band", [1600, 1500, 1700]),
    ("Fatima Said", "band", [1000, 950, 1200]),
    ("Oskar Lind", "band", [1750, 1800, 1650]),
    ("Elin Dahl", "band", None),                    # new, no history
    ("Hamid Karimi", "stod", [1200, 1300, 1100]),
    ("Lisa Holm", "stod", [1150, 1000, 1250]),
]

print("bands")
for name, pkgs in BANDS.items():
    b = call("POST", "/bands/", {"name": name})
    for d in [today] + days:
        call("PUT", f"/bands/{b['id']}/load", {"date": d.isoformat(), "packages": round(pkgs * random.uniform(0.85, 1.15))})

print("workers")
for name, role, hist in WORKERS:
    w = call("POST", "/workers/", {"name": name, "role": role})
    if not hist:
        continue
    for d, pkgs in zip(days, hist):
        heavy = round(pkgs * random.uniform(0.03, 0.08))
        call("PUT", f"/workers/{w['id']}/load", {"date": d.isoformat(), "packages_handled": pkgs, "heavy_packages": heavy})

print("done ->", BASE)
