import { chromium } from 'playwright'; import fs from 'fs';
const timing=JSON.parse(fs.readFileSync(process.argv[2])); const times=process.argv[3].split(',').map(Number);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1080,height:1920}}); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8766/engine/scene.html'); await p.waitForFunction('window.ready===true');
await p.evaluate(([t])=>window.setup(t,.5),[timing]);
for(const T of times){const d=await p.evaluate(T=>window.grab(T),T);fs.writeFileSync(`/home/claude/chk/m_${T}.jpg`,Buffer.from(d,'base64'));}
await b.close();
