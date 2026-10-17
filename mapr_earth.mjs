// usage: node mapr_earth.mjs <timing.json> <spec.json> <outdir> <start> <end> <earthFramesDir> <nEarth>
import { chromium } from 'playwright'; import fs from 'fs';
const [,, tf, sf, out, s0, s1, ed, ne] = process.argv;
const timing = JSON.parse(fs.readFileSync(tf)), spec = JSON.parse(fs.readFileSync(sf)); const NE = Number(ne);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:8766/engine/map.html'); await p.waitForFunction('window.ready===true');
await p.evaluate(([t, s]) => window.setup(t, s), [timing, spec]);
const lastEarth = Math.max(...spec.lines.map((l, k) => l.beat && l.beat.earth ? k : -1));
const earthEnd = timing[lastEarth + 1] ? timing[lastEarth + 1].start + 0.5 : 1e9;
fs.mkdirSync(out, { recursive: true }); let cur = -1;
for (let f = Number(s0); f < Number(s1); f++) {
  const T = f / 30;
  if (T < earthEnd) { const k = Math.min(f, NE - 1) + 1; if (k !== cur) { cur = k;
    const d = fs.readFileSync(`${ed}/e${String(k).padStart(5, '0')}.jpg`).toString('base64');
    await p.evaluate(src => new Promise(r => { const im = new Image(); im.onload = () => { window.EIMG = im; r(); }; im.src = src; }), 'data:image/jpeg;base64,' + d); } }
  const d = await p.evaluate(T => window.grab(T), T); fs.writeFileSync(`${out}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(d, 'base64'));
}
await b.close();
