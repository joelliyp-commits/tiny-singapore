#!/usr/bin/env python3
"""Build one Tiny Singapore video from a spec JSON.  usage: python3 make.py videos/v001.json"""
import json, sys, os, subprocess, time, shutil
import numpy as np, soundfile as sf

ENGINE = os.path.dirname(os.path.abspath(__file__))
SCALE = 0.667
FPS = 30
GAP = 0.22
VOICE, SPEED = "am_michael", 1.12
t0 = time.time()
spec = json.load(open(sys.argv[1]))
vid = spec["id"]
W = os.path.join(ENGINE, "work", vid)
REUSE = "--reuse" in sys.argv
MOTION = bool(spec.get("motion"))
BOARD = spec.get("style") == "board"
if not REUSE: shutil.rmtree(W, ignore_errors=True); os.makedirs(W)
log = lambda m: print(f"[{time.time()-t0:5.0f}s] {m}", flush=True)

# 1. voice
if REUSE:
    timing=json.load(open(f"{W}/timing.json")); total=timing[-1]["start"]+timing[-1]["dur"]
    if MOTION:
        json.dump(spec, open(f"{W}/spec.json", "w")); shutil.rmtree(f"{W}/kin", ignore_errors=True)
        subprocess.run(["node", f"{ENGINE}/kin.mjs", f"{W}/spec.json", W], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{W}/kin/list.txt", "-vf", f"fps={FPS},format=argb", "-c:v", "qtrle", f"{W}/kin.mov"], check=True)
        log("kinetic captions rebuilt")
    if BOARD:
        json.dump(spec, open(f"{W}/spec.json", "w")); shutil.rmtree(f"{W}/board", ignore_errors=True)
        subprocess.run(["node", f"{ENGINE}/board.mjs", f"{W}/spec.json", W], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{W}/board/list.txt", "-vf", f"fps={FPS},format=argb", "-c:v", "qtrle", f"{W}/board.mov"], check=True)
        log("board layer rebuilt")
else:
  pass
if not REUSE:
    from kokoro_onnx import Kokoro
    k = Kokoro("/home/claude/trial/tts/kokoro-v1.0.onnx", "/home/claude/trial/tts/voices-v1.0.bin")
    sr = 24000; parts = []; timing = []; t = 0.0
    for i, ln in enumerate(spec["lines"]):
        from saynorm import norm
        a, sr = k.create(norm(ln["say"]), voice=VOICE, speed=SPEED, lang="en-us")
        nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(nz[0] - 500, 0): nz[-1] + 1200]
        tail = GAP + (1.0 if i == len(spec["lines"]) - 1 else 0)
        parts += [a, np.zeros(int(tail * sr), dtype=a.dtype)]
        d = len(a) / sr + tail
        timing.append({"scene": ln.get("scene"), "tpl": ln.get("tpl"), "p": ln.get("p"), "bg": ln.get("bg"), "motion": MOTION, "style": spec.get("style"), "start": round(t, 3), "dur": round(d, 3)}); t += d
    total = t
    voice = np.concatenate(parts); voice = voice / np.max(np.abs(voice)) * 0.9
    sf.write(f"{W}/voice.wav", voice, sr)
    json.dump(timing, open(f"{W}/timing.json", "w"))
    log(f"voice {total:.1f}s")

    # 2. render 3D frames, two workers in parallel
    N = int(round(total * FPS)); mid = N // 2
    procs = [subprocess.Popen(["node", f"{ENGINE}/render.mjs", f"{W}/timing.json", f"{W}/frames", str(a), str(b), str(SCALE)])
             for a, b in [(0, mid), (mid, N)]]
    # 3. overlays while rendering
    jobs = [{"out": f"{W}/ov_brand.png", "brand": "@tiny_singapore"},
            {"out": f"{W}/ov_title.png", "title": "" if BOARD else spec["title"]}]
    for i, ln in enumerate(spec["lines"]):
        jobs.append({"out": f"{W}/ov_{i:02d}.png", "cap": "" if MOTION else ln["cap"], "stat": "" if ((MOTION and ln.get("count")) or (BOARD and ln.get("draw"))) else ln.get("stat", ""),
                     "statTop": 560 if i == 0 else 250})
    if spec.get("source"):
        jobs.append({"out": f"{W}/ov_src.png", "src": spec["source"]})
    json.dump(jobs, open(f"{W}/jobs.json", "w"))
    subprocess.run(["node", f"{ENGINE}/overlays.mjs", f"{W}/jobs.json"], check=True)
    if MOTION:
        json.dump(spec, open(f"{W}/spec.json", "w"))
        subprocess.run(["node", f"{ENGINE}/kin.mjs", f"{W}/spec.json", W], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{W}/kin/list.txt", "-vf", f"fps={FPS},format=argb",
                        "-c:v", "qtrle", f"{W}/kin.mov"], check=True)
        log("kinetic captions built")
    if BOARD:
        subprocess.run(["node", f"{ENGINE}/board.mjs", f"{W}/spec.json" if MOTION else sys.argv[1], W], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{W}/board/list.txt", "-vf", f"fps={FPS},format=argb",
                        "-c:v", "qtrle", f"{W}/board.mov"], check=True)
        log("board layer built")
    # 4. music bed
    subprocess.run([sys.executable, f"{ENGINE}/music.py", str(total), f"{W}/music.wav"], check=True)
    for p in procs:
        p.wait()
        if p.returncode: raise SystemExit("render failed")
    log(f"rendered {N} frames")

# 5. compose
mask = f"{ENGINE}/tiltmask.png"
if BOARD:
    inputs = ["-framerate", str(FPS), "-i", f"{W}/frames/f%05d.png", "-loop", "1", "-framerate", str(FPS), "-i", f"{W}/board_bg.png"]
else:
    inputs = ["-framerate", str(FPS), "-i", f"{W}/frames/f%05d.jpg", "-i", mask]
ov = []  # (file, start, end)
ov.append((f"{W}/ov_brand.png", 0, total))
ov.append((f"{W}/ov_title.png", 0, timing[0]["start"] + timing[0]["dur"]))
for i, s in enumerate(timing):
    ov.append((f"{W}/ov_{i:02d}.png", s["start"], s["start"] + s["dur"]))
if spec.get("source"):
    srcfrom = timing[max(0, len(timing) - 3)]["start"]
    ov.append((f"{W}/ov_src.png", srcfrom, total))
for f, a, b in ov:
    inputs += ["-i", f]
fg = [f"[0:v]scale=720:1280,format=rgba,split[a][b]",
      "[b]boxblur=5:2[bb]", "[1:v]format=gray,scale=720:1280,loop=-1:1:0[m]", "[bb][m]alphamerge[bba]",
      "[a][bba]overlay=0:0,vignette=PI/5,scale=1080:1920:flags=lanczos[v0]"]
if BOARD:
    fg = ["[0:v]scale=1080:1920:flags=lanczos,format=rgba[f3]", "[1:v]format=rgba[bgp]", f"[bgp][f3]overlay=0:{spec.get('board_y', 260)}:shortest=1[v0]"]
cur = "v0"
for j, (f, a, b) in enumerate(ov):
    fg.append(f"[{cur}][{j+2}:v]overlay=0:0:eof_action=repeat:enable='between(t,{a:.3f},{b:.3f})'[v{j+1}]")
    cur = f"v{j+1}"
fg.append(f"[{cur}]format=yuv420p[vout]")
na = len(ov) + 2
if BOARD:
    inputs += ["-i", f"{W}/board.mov"]
    fg.insert(3, f"[v0][{na}:v]overlay=0:0:eof_action=repeat[v0b]")
    fg = [x.replace("[v0][", "[v0b][", 1) if x.startswith("[v0][") and "v0b" not in x else x for x in fg]
    na += 1
if MOTION:
    inputs += ["-i", f"{W}/kin.mov"]
    fg.insert(len(fg) - 1, f"[{cur}][{na}:v]overlay=0:0:eof_action=repeat[vk]")
    fg[-1] = "[vk]format=yuv420p[vout]"
    na += 1
inputs += ["-i", f"{W}/voice.wav", "-i", f"{W}/music.wav"]
fg += [f"[{na}:a]aresample=44100,aformat=channel_layouts=stereo,asplit[vo1][vo2]",
       f"[{na+1}:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.20[mu]",
       "[mu][vo1]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=300[md]",
       "[md][vo2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[aout]"]
out = f"{ENGINE}/out/{vid}.mp4"; os.makedirs(f"{ENGINE}/out", exist_ok=True)
if os.path.exists(f"{ENGINE}/out/{vid}_raw.mp4"): os.remove(f"{ENGINE}/out/{vid}_raw.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fg), "-map", "[vout]", "-map", "[aout]",
                "-t", f"{total:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-profile:v", "high",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
log(f"done -> {out}")
subprocess.run([sys.executable, f"{ENGINE}/coverize.py", vid], check=True)
log("cover added")
