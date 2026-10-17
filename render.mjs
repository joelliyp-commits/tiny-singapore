// usage: node render.mjs <timing.json> <outdir> <start> <end> <scale>
import { chromium } from 'playwright';
import fs from 'fs';
const [,, tfile, outdir, s0, s1, scale] = process.argv;
const timing = JSON.parse(fs.readFileSync(tfile));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:8766/engine/scene.html');
await p.waitForFunction('window.ready===true', null, { timeout: 60000 });
await p.evaluate(([t, s]) => window.setup(t, s), [timing, Number(scale)]);
fs.mkdirSync(outdir, { recursive: true });
for (let f = Number(s0); f < Number(s1); f++) {
  const b64 = await p.evaluate(T => window.grab(T), f / 30);
  fs.writeFileSync(`${outdir}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(b64, 'base64'));
}
await b.close();
