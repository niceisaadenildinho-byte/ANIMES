import json, re, urllib.request
from pathlib import Path

RELEASE_API = "https://api.github.com/repos/cedya77/anime-offline-database/releases/latest"
OUT = Path("app/src/main/assets/anime-catalog.js")

req = urllib.request.Request(RELEASE_API, headers={"User-Agent": "Orbita-Anime-Build"})
with urllib.request.urlopen(req, timeout=60) as r:
    release = json.load(r)

asset = next(a for a in release.get("assets", []) if a.get("name") == "anime-offline-database-minified.json")
url = asset["browser_download_url"]
print("Baixando catálogo:", url)
req = urllib.request.Request(url, headers={"User-Agent": "Orbita-Anime-Build"})
with urllib.request.urlopen(req, timeout=180) as r:
    raw = json.load(r)

items = raw.get("data", []) if isinstance(raw, dict) else raw
if not isinstance(items, list):
    raise RuntimeError("Formato inesperado do banco de animes")

blocked_exact = {"hentai", "pornographic", "erotica", "explicit sexual content", "adult content"}
mal_re = re.compile(r"myanimelist\.net/anime/(\d+)")

def get_score(value):
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    if isinstance(value, dict):
        for key in ("arithmeticGeometricMean", "arithmeticMean", "median"):
            v = value.get(key)
            if isinstance(v, (int, float)):
                return round(float(v), 2)
    return None

out = []
for idx, a in enumerate(items):
    if not isinstance(a, dict):
        continue
    tags = []
    for t in a.get("tags") or []:
        t = str(t).strip().lower()
        if t and t not in tags:
            tags.append(t)
    if any(t in blocked_exact for t in tags):
        continue

    mal_id = None
    for src in a.get("sources") or []:
        m = mal_re.search(str(src))
        if m:
            mal_id = int(m.group(1))
            break

    season = a.get("animeSeason") or {}
    title = str(a.get("title") or "Sem título").strip()
    synonyms = [str(x).strip() for x in (a.get("synonyms") or []) if str(x).strip()][:8]
    picture = a.get("picture") or a.get("thumbnail") or ""
    thumb = a.get("thumbnail") or picture
    eps = a.get("episodes")
    try:
        eps = int(eps) if eps is not None else 0
    except Exception:
        eps = 0
    year = season.get("year") if isinstance(season, dict) else None
    try:
        year = int(year) if year else None
    except Exception:
        year = None

    out.append({
        "id": mal_id if mal_id is not None else f"db-{idx}",
        "title": title,
        "syn": synonyms,
        "image": str(picture),
        "thumb": str(thumb),
        "type": str(a.get("type") or "UNKNOWN"),
        "episodes": eps,
        "status": str(a.get("status") or "UNKNOWN"),
        "year": year,
        "season": str(season.get("season") or "") if isinstance(season, dict) else "",
        "tags": tags[:40],
        "score": get_score(a.get("score")),
    })

if len(out) <= 30000:
    raise RuntimeError(f"Catálogo ficou abaixo de 30.000: {len(out)}")

OUT.parent.mkdir(parents=True, exist_ok=True)
meta = {
    "count": len(out),
    "release": release.get("tag_name"),
    "source": "cedya77/anime-offline-database",
}
with OUT.open("w", encoding="utf-8") as f:
    f.write("window.ANIME_DB_META=")
    json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";window.ANIME_DB=")
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";")

print(f"Catálogo final: {len(out)} animes")
print(f"Arquivo: {OUT} ({OUT.stat().st_size / 1024 / 1024:.1f} MB)")
