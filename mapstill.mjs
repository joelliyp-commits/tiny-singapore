import { chromium } from 'playwright'; import fs from 'fs';
const timing=JSON.parse(fs.readFileSync(process.argv[2])),spec=JSON.parse(fs.readFileSync(process.argv[3]));const times=process.argv[4].split(',').map(Number);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8766/engine/map.html');await p.waitForFunction('window.ready===true');await p.evaluate(([t,s])=>window.setup(t,s),[timing,spec]);
for(const T of times){const d=await p.evaluate(T=>window.grab(T),T);fs.writeFileSync(`/home/claude/chk/map_${T}.jpg`,Buffer.from(d,'base64'));}await b.close();
