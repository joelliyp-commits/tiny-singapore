// usage: node mapr.mjs <timing.json> <spec.json> <outdir> <start> <end>
import { chromium } from 'playwright'; import fs from 'fs';
const [,, tf, sf, out, s0, s1] = process.argv;
const timing = JSON.parse(fs.readFileSync(tf)), spec = JSON.parse(fs.readFileSync(sf));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:8766/engine/map.html'); await p.waitForFunction('window.ready===true');
await p.evaluate(([t, s]) => window.setup(t, s), [timing, spec]);
fs.mkdirSync(out, { recursive: true });
for (let f = Number(s0); f < Number(s1); f++) { const d = await p.evaluate(T => window.grab(T), f / 30); fs.writeFileSync(`${out}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(d, 'base64')); }
await b.close();
