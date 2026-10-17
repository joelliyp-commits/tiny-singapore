#!/usr/bin/env bash
# Rebuild the Tiny Singapore video engine in a fresh session.
set -e
cd "$(dirname "$0")"
npm install --no-audit --no-fund
pip install --break-system-packages kokoro-onnx==0.6.1 soundfile numpy pillow
mkdir -p /home/claude/trial/tts
cd /home/claude/trial/tts
[ -f kokoro-v1.0.onnx ] || curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
[ -f voices-v1.0.bin ] || curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
which ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)
fc-list | grep -qi "Noto Color Emoji" || (apt-get install -y -qq fonts-noto-color-emoji)
echo "Engine ready. Start the local server: (setsid nohup python3 -m http.server 8766 --directory /home/claude >/dev/null 2>&1 &)"
