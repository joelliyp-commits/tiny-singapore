// usage: node flat.mjs <timing.json> <spec.json> <outdir> <start> <end>
import { chromium } from 'playwright'; import fs from 'fs';
const [,,tf,sf,out,a,b]=process.argv;const timing=JSON.parse(fs.readFileSync(tf)),spec=JSON.parse(fs.readFileSync(sf));
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await br.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('FLATERR',e.message));
await p.goto('http://localhost:8766/engine/flat.html');await p.evaluate(()=>document.fonts.ready);await p.evaluate(([s,t])=>window.init(s,t),[spec,timing]);
fs.mkdirSync(out,{recursive:true});
for(let f=+a;f<+b;f++){await p.evaluate(T=>window.draw(T),f/30);await p.screenshot({path:`${out}/f${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:90});}
await br.close();
