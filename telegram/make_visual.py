#!/usr/bin/env python3
"""Render Save With Property Telegram visuals (1080x1080) from a JSON spec.

Usage: python3 make_visual.py spec.json out_base
  Writes out_base.png (single), out_base_1.png .. out_base_N.png (carousel),
  or out_base.mp4 (video). Prints a JSON summary: files, overflow warnings.

Styles (all share tag, hook, take, sources):
  card       stats: [{num, dir: up|down|gold, label}]  (1 or 2 stats)
  chart      chart: {type: line|bar, labels: [...], series: [{name, values, color?}],
                     unit?: "%", prefix?: "$", dp?: 2, highlight?: idx, min?, max?, labelAll?}
  table      columns: [...], rows: [[...]], highlight_col?: idx   (max ~5 rows, 3 cols)
  checklist  items: ["Point<small>detail</small>", ...], numbered?: false   (3 to 4 items)
  mythfact   myth: "...", fact: "..."
  timeline   steps: [{when, what, on?: true}]   (3 to 5 steps)
  map        map: {areas?: [{name,x,y,rx,ry}], roads?: [{points}], lines?: [{name,color,points,stations:[{name,x,y,dx?,dy?}]}],
                   pins: [{x,y,label,color?,lx?,ly?}]}   coordinates 0..100, schematic only
  text       paras: ["...", ...]   (carousel slides)
  carousel   slides: [spec, ...]   3 to 5 slides; each slide inherits tag and sources
  video      any one static spec plus "video": true -> animated mp4 (about 8 to 12 s, silent)

Rules: hook under 16 words with the key phrase in <em>; no hyphens or dashes in text
(a minus sign on a number is fine); never use photos from news sites; schematic maps only.
"""
import json, os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(sys.argv[1]))
base = os.path.abspath(sys.argv[2])
url = "file://" + os.path.join(HERE, "visuals.html")
CHECK = "() => [...document.querySelectorAll('.body')].some(b => b.scrollHeight > b.clientHeight + 2)"

def slides_of(s):
    if s.get("style") != "carousel":
        return [s]
    out, n = [], len(s["slides"])
    for i, sl in enumerate(s["slides"]):
        sl = dict(sl)
        sl.setdefault("tag", s.get("tag", ""))
        sl.setdefault("sources", s.get("sources", ""))
        sl["pager"] = f"{i+1} / {n}"
        out.append(sl)
    return out

summary = {"files": [], "overflow": []}
with sync_playwright() as p:
    b = p.chromium.launch()
    if spec.get("video"):
        vdir = tempfile.mkdtemp()
        ctx = b.new_context(viewport={"width": 1080, "height": 1080},
                            record_video_dir=vdir, record_video_size={"width": 1080, "height": 1080})
        pg = ctx.new_page()
        pg.goto(url); pg.wait_for_function("window.ready===true"); pg.wait_for_timeout(800)
        res = pg.evaluate("s => window.render(s, true)", spec)
        pg.wait_for_timeout(int((res["duration"] + 7) * 1000))
        if pg.evaluate(CHECK): summary["overflow"].append("video")
        vpath = pg.video.path(); ctx.close()
        out = base + ".mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.9", "-i", vpath, "-c:v", "libx264", "-preset", "veryfast",
                        "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out], check=True)
        summary["files"].append(out)
    else:
        pg = b.new_page(viewport={"width": 1080, "height": 1080})
        pg.goto(url); pg.wait_for_function("window.ready===true"); pg.wait_for_timeout(800)
        sl = slides_of(spec)
        for i, s in enumerate(sl):
            pg.evaluate("s => window.render(s, false)", s)
            pg.wait_for_timeout(150)
            out = base + (f"_{i+1}" if len(sl) > 1 else "") + ".png"
            pg.screenshot(path=out)
            if pg.evaluate(CHECK): summary["overflow"].append(os.path.basename(out))
            summary["files"].append(out)
    b.close()
print(json.dumps(summary))
