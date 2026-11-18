"""MovieVerse Analytics - clean MovieLens CSVs and emit MongoDB-ready JSON (one doc per line)."""
import csv, json, re, os, sys
from datetime import datetime, timezone
from collections import defaultdict
SRC = sys.argv[1] if len(sys.argv) > 1 else "data"
OUT = sys.argv[2] if len(sys.argv) > 2 else "output"
os.makedirs(OUT, exist_ok=True)
def rows(n): return csv.DictReader(open(os.path.join(SRC, n), encoding="utf-8"))
def iso(ts): return {"$date": datetime.fromtimestamp(int(ts), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
links = {r["movieId"]: r for r in rows("links.csv")}
stats = defaultdict(lambda: [0, 0.0])
ratings = []
for r in rows("ratings.csv"):
    s = stats[r["movieId"]]; s[0] += 1; s[1] += float(r["rating"])
    ratings.append({"userId": int(r["userId"]), "movieId": int(r["movieId"]), "rating": float(r["rating"]), "ratedAt": iso(r["timestamp"])})
tagcount = defaultdict(int); tags = []
for r in rows("tags.csv"):
    t = r["tag"].strip()
    if not t: continue
    tagcount[r["movieId"]] += 1
    tags.append({"userId": int(r["userId"]), "movieId": int(r["movieId"]), "tag": t, "tagLower": t.lower(), "taggedAt": iso(r["timestamp"])})
movies = []
for r in rows("movies.csv"):
    title = r["title"].strip(); m = re.search(r"\((\d{4})\)\s*$", title)
    year = int(m.group(1)) if m else None
    clean = re.sub(r"\s*\(\d{4}\)\s*$", "", title) if m else title
    g = [] if r["genres"] == "(no genres listed)" else r["genres"].split("|")
    l = links.get(r["movieId"], {}); c, tot = stats[r["movieId"]]
    movies.append({"_id": int(r["movieId"]), "title": clean, "year": year, "genres": g,
        "links": {"imdbId": l.get("imdbId") or None, "tmdbId": int(l["tmdbId"]) if l.get("tmdbId") else None},
        "ratingStats": {"count": c, "average": round(tot / c, 3) if c else None}, "tagCount": tagcount[r["movieId"]]})
users = []
ucount = defaultdict(int)
for x in ratings: ucount[x["userId"]] += 1
for r in rows("users.csv"):
    users.append({"_id": int(r["userId"]), "displayName": r["displayName"].strip(), "email": r["email"].strip().lower(), "country": r["country"].strip(), "ratingCount": ucount[int(r["userId"])]})
for name, docs in [("movies", movies), ("users", users), ("ratings", ratings), ("tags", tags)]:
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        for d in docs: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(f"{name}: {len(docs)}")
