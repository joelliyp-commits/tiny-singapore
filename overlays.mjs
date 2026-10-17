// usage: node overlays.mjs <jobs.json>  jobs: [{out, ...drawOpts}]
import { chromium } from 'playwright';
import fs from 'fs';
const jobs = JSON.parse(fs.readFileSync(process.argv[2]));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('http://localhost:8766/engine/overlay.html');
for (const j of jobs) { await p.evaluate(o => window.draw(o), j); await p.screenshot({ path: j.out, omitBackground: true }); }
await b.close();
