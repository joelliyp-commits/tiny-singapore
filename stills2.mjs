import { chromium } from 'playwright';
import fs from 'fs';
const specs = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
for (const sp of specs) {
  const spec = JSON.parse(fs.readFileSync(sp));
  const timing = spec.lines.map((l, i) => ({ scene: l.scene, tpl: l.tpl, p: l.p, bg: l.bg, start: i * 3, dur: 3 }));
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('PAGEERR', spec.id, e.message));
  await p.goto('http://localhost:8766/engine/scene.html');
  await p.waitForFunction('window.ready===true', null, { timeout: 60000 });
  await p.evaluate(t => window.setup(t, 0.4), timing);
  fs.mkdirSync('stills', { recursive: true });
  for (let i = 0; i < timing.length; i++) {
    const b64 = await p.evaluate(T => window.grab(T), i * 3 + 2.2);
    fs.writeFileSync(`stills/${spec.id}_${i}.jpg`, Buffer.from(b64, 'base64'));
  }
  await p.close();
}
await b.close(); console.log('ok');
