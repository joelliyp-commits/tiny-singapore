#!/usr/bin/env python3
"""Render a Save With Property Telegram card (1080x1080 PNG).

Usage: python3 make_card.py spec.json out.png

spec.json:
{
  "tag": "MARKET UPDATE · Q3 2026",
  "hook": "HDB prices are falling.<br>So why are <em>more flats selling above $1M</em> than ever?",
  "stats": [{"num": "−0.2%", "dir": "down", "label": "HDB resale index in Q3<br>Third dip in a row"},
            {"num": "597", "dir": "up", "label": "Flats sold at $1M+ in Q3<br>A new record"}],
  "take": "The market isn't moving as one. Which side is your flat on?",
  "sources": "Sources: HDB flash estimates,<br>Realion Research"
}
Rules: 1 or 2 stats; hook under 16 words with the key phrase in <em>; no hyphens or dashes
in text (a minus sign on a number is fine); never use photos from news sites.
"""
import json, os, sys, subprocess, tempfile

here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(sys.argv[1]))
out = os.path.abspath(sys.argv[2])
stats = "".join(
    f'<div class="stat"><div class="num {s.get("dir","up")}">{s["num"]}</div>'
    f'<div class="lbl">{s["label"]}</div></div>' for s in spec["stats"])
html = open(os.path.join(here, "card_template.html")).read()
for k, v in {"tag": spec["tag"], "hook": spec["hook"], "stats": stats,
             "take": spec["take"], "sources": spec["sources"]}.items():
    html = html.replace("{{" + k + "}}", v)
tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, dir=here)
tmp.write(html); tmp.close()
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();"
      "const p=await b.newPage({viewport:{width:1080,height:1080}});"
      f"await p.goto('file://{tmp.name}');await p.waitForTimeout(1500);"
      f"await p.screenshot({{path:'{out}'}});await b.close();}})()")
subprocess.run(["node", "-e", js], check=True)
os.unlink(tmp.name)
print(out)
