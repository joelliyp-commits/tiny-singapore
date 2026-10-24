#!/usr/bin/env python3
"""Flat illustrated story style. usage: python3 flat_make.py videos/x.json"""
import json, sys, os, subprocess, time, shutil
import numpy as np, soundfile as sf
ENGINE=os.path.dirname(os.path.abspath(__file__)); FPS=30; GAP=0.22; VOICE,SPEED="am_michael",1.12
t0=time.time(); spec=json.load(open(sys.argv[1])); vid=spec["id"]; W=os.path.join(ENGINE,"work",vid)
shutil.rmtree(W,ignore_errors=True); os.makedirs(W)
log=lambda m: print(f"[{time.time()-t0:5.0f}s] {m}",flush=True)
from kokoro_onnx import Kokoro
k=Kokoro("/home/claude/trial/tts/kokoro-v1.0.onnx","/home/claude/trial/tts/voices-v1.0.bin")
parts=[];timing=[];t=0.0
for i,ln in enumerate(spec["lines"]):
    from saynorm import norm
    a,sr=k.create(norm(ln["say"]),voice=VOICE,speed=SPEED,lang="en-us")
    nz=np.where(np.abs(a)>0.01)[0];a=a[max(nz[0]-500,0):nz[-1]+1200]
    tail=GAP+(1.0 if i==len(spec["lines"])-1 else 0);parts+=[a,np.zeros(int(tail*sr),dtype=a.dtype)]
    d=len(a)/sr+tail;timing.append({"start":round(t,3),"dur":round(d,3)});t+=d
total=t;voice=np.concatenate(parts);voice=voice/np.max(np.abs(voice))*0.9
sf.write(f"{W}/voice.wav",voice,sr);json.dump(timing,open(f"{W}/timing.json","w"));json.dump(spec,open(f"{W}/spec.json","w"));log(f"voice {total:.1f}s")
N=int(round(total*FPS));mid=N//2
procs=[subprocess.Popen(["node",f"{ENGINE}/flat.mjs",f"{W}/timing.json",f"{W}/spec.json",f"{W}/frames",str(a),str(b)]) for a,b in [(0,mid),(mid,N)]]
subprocess.run([sys.executable,f"{ENGINE}/music.py",str(total),f"{W}/music.wav"],check=True)
for p in procs:
    p.wait()
    if p.returncode: raise SystemExit("render failed")
log(f"rendered {N} frames")
out=f"{ENGINE}/out/{vid}.mp4"
fg=["[1:a]aresample=44100,aformat=channel_layouts=stereo,asplit[vo1][vo2]","[2:a]aresample=44100,aformat=channel_layouts=stereo,volume=0.20[mu]",
    "[mu][vo1]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=300[md]","[md][vo2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[aout]"]
subprocess.run(["ffmpeg","-v","error","-y","-framerate",str(FPS),"-i",f"{W}/frames/f%05d.jpg","-i",f"{W}/voice.wav","-i",f"{W}/music.wav","-filter_complex",";".join(fg),
  "-map","0:v","-map","[aout]","-t",f"{total:.3f}","-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart",out],check=True)
log(f"done -> {out}")
