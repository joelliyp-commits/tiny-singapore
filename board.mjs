// usage: node board.mjs <spec.json> <workdir>  -> workdir/board_bg.png, workdir/board/*.png + list.txt (concat demuxer)
import { chromium } from 'playwright'; import fs from 'fs';
const spec=JSON.parse(fs.readFileSync(process.argv[2])); const W=process.argv[3];
const timing=JSON.parse(fs.readFileSync(`${W}/timing.json`)); const FPS=30;
const total=timing.at(-1).start+timing.at(-1).dur; const N=Math.round(total*FPS);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('BOARDERR',e.message));
await p.goto('http://localhost:8766/engine/board.html'); await p.evaluate(()=>document.fonts.ready);
await p.evaluate(([s,t])=>window.init(s,t),[spec,timing]);
await p.evaluate(()=>window.bg()); await p.screenshot({path:`${W}/board_bg.png`});
await p.evaluate(()=>{document.getElementById('s').innerHTML=''});
const keys=[];for(let f=0;f<N;f++)keys.push(await p.evaluate(T=>window.key(T),f/FPS));
const uniq=[];for(let f=0;f<N;f++){if(uniq.length&&uniq.at(-1).k===keys[f])uniq.at(-1).d++;else uniq.push({k:keys[f],f,d:1});}
fs.mkdirSync(`${W}/board`,{recursive:true});let list='';
for(let j=0;j<uniq.length;j++){const f=`${W}/board/b${String(j).padStart(5,'0')}.png`;await p.evaluate(T=>window.draw(T),uniq[j].f/FPS);await p.screenshot({path:f,omitBackground:true});list+=`file '${f}'\nduration ${(uniq[j].d/FPS).toFixed(5)}\n`;}
list+=`file '${W}/board/b${String(uniq.length-1).padStart(5,'0')}.png'\n`;fs.writeFileSync(`${W}/board/list.txt`,list);
console.log('board frames',uniq.length,'of',N);await b.close();
