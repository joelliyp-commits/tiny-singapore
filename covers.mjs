// usage: node covers.mjs vXXX [vYYY...]  -> out/covers/vXXX.jpg
import { chromium } from 'playwright'; import fs from 'fs';
const PILL={tag:'',bank:'',bars:'',versus:'',signpost:'',dominoes:'',gov:'',cpf:'',lease:'',developer:'',rent:'',wave:'',hesitate:'',tower:'',township:''};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('http://localhost:8766/engine/cover.html'); fs.mkdirSync('out/covers',{recursive:true});
for (const id of process.argv.slice(2)) {
  const spec = JSON.parse(fs.readFileSync(`videos/${id}.json`)); const t = JSON.parse(fs.readFileSync(`work/${id}/timing.json`));
  const f = Math.round((t[0].start + t[0].dur * .85) * 30); const fr = `f${String(f).padStart(5,'0')}.jpg`;
  await p.evaluate(o => window.draw(o), { bg: `http://localhost:8766/engine/work/${id}/frames/${fr}`, title: spec.title, pill: spec.pill || '' });
  await p.screenshot({ path: `out/covers/${id}.jpg`, type: 'jpeg', quality: 92 }); console.log(id);
}
await b.close();
