import { chromium } from 'playwright';
import fs from 'fs';
const scenes = process.argv[2].split(',').map(s => isNaN(s) ? s : Number(s));
const timing = scenes.map((s, i) => ({ scene: s, start: i * 3, dur: 3 }));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:8766/engine/scene.html');
await p.waitForFunction('window.ready===true', null, { timeout: 60000 });
await p.evaluate(t => window.setup(t, 0.5), timing);
fs.mkdirSync('stills', { recursive: true });
for (let i = 0; i < scenes.length; i++) {
  const b64 = await p.evaluate(T => window.grab(T), i * 3 + 2.2);
  fs.writeFileSync(`stills/s_${scenes[i]}.jpg`, Buffer.from(b64, 'base64'));
}
await b.close(); console.log('ok');
