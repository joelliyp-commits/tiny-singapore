# Tiny Singapore video engine

Faceless SG property shorts for TikTok, Instagram and YouTube (tiny_singapore).

## Layout
- `queue.json`: topic list, statuses, slots, CTA system and standing rules. Source of truth.
- `videos/*.json`: one spec per video (lines with say, cap, beat, counts).
- `make.py`: 3D / motion style build (scene.html + render.mjs + kin.mjs + overlays.mjs).
- `map_make.py`: top-down map style build (map.html + mapr.mjs). `mapr_earth.mjs` adds Google Earth Studio footage for lines with `beat.earth`.
- `saynorm.py`: narration normaliser ($X read as "X dollars").
- `music.py`, `coverize.py`: bed music and covers.

## Fresh session
1. Clone to `/home/claude/engine` (paths assume this).
2. `./setup.sh`
3. Start the server on port 8766 serving `/home/claude`.
4. Build: `python3 make.py videos/vNNN.json` or `python3 map_make.py videos/vNNN.json`. Output goes to `out/`.

Not in the repo: `out/` (finished videos), `work/` (frames), `node_modules/`, the Kokoro model (setup.sh downloads it).

## Content rules (summary)
UK English, no dashes, CEA safe wording, probability language, facts checked against 2 sources, never name convicted individuals, politically neutral. Two approvals per video (script, then video). No new comment keywords for now: CHECK, PLAN, WHY, "flat type and town".
