#!/usr/bin/env python3
"""Make cover jpg (out/covers/ID.jpg) and prepend it as a 0.2s first frame. usage: python3 coverize.py v012 [v013 ...]"""
import subprocess, sys, os, shutil
E = os.path.dirname(os.path.abspath(__file__))
ids = sys.argv[1:]
subprocess.run(["node", f"{E}/covers.mjs", *ids], check=True, cwd=E)
for i in ids:
    src = f"{E}/out/{i}.mp4"; raw = f"{E}/out/{i}_raw.mp4"
    if not os.path.exists(raw): shutil.copy(src, raw)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", "0.2", "-framerate", "30", "-i", f"{E}/out/covers/{i}.jpg", "-i", raw,
        "-filter_complex", "[0:v]scale=1080:1920,format=yuv420p,setsar=1[c];[1:v]setsar=1[m];[c][m]concat=n=2:v=1:a=0[v];[1:a]adelay=200|200[a]",
        "-map", "[v]", "-map", "[a]", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", src], check=True)
    print(i, "cover added")
