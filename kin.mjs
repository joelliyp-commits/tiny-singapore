// usage: node kin.mjs <spec.json> <workdir>   -> workdir/kin/*.png + list.txt (concat demuxer)
import { chromium } from 'playwright'; import fs from 'fs';
const spec=JSON.parse(fs.readFileSync(process.argv[2])); const W=process.argv[3];
const timing=JSON.parse(fs.readFileSync(`${W}/timing.json`)); const FPS=30, GAP=.22;
const eo=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
const total=timing.at(-1).start+timing.at(-1).dur;
const words=spec.lines.map(ln=>{let g=false;const out=[];for(const raw of ln.cap.split(/\s+/)){if(!raw)continue;let t=raw;const st=g||t.startsWith('*');if(t.startsWith('*'))t=t.slice(1);let end=false;if(t.endsWith('*')){t=t.slice(0,-1);end=true}else if(t.includes('*')){const i=t.indexOf('*');t=t.slice(0,i)+t.slice(i+1);end=true}
  out.push({t:t.replace(/&/g,'&amp;').replace(/</g,'&lt;'),g:st});g=st&&!end;}return out});
const fmt=(v,c)=>(c.pre||'')+Math.round(v).toLocaleString('en-US')+(c.suf||'');
const states=[];
for(let f=0;f<Math.round(total*FPS);f++){const T=f/FPS;let i=timing.findIndex((x,k)=>T>=x.start&&(k===timing.length-1||T<timing[k+1].start));if(i<0)i=0;
  const seg=timing[i],lt=T-seg.start,ln=spec.lines[i],ws=words[i];const speak=Math.max(.6,(seg.dur-GAP-(i===timing.length-1?1:0)))*.88;
  const wt=ws.map(w=>w.t.length+2);const tot=wt.reduce((a,b)=>a+b,0);let acc=0;const rev=wt.map(x=>{const r=.08+acc/tot*speak;acc+=x;return r});
  let n=rev.filter(r=>lt>=r).length;const age=n?lt-rev[n-1]:1;const pop=+(1+.22*(1-eo(age/.18))).toFixed(2);
  // chunk into groups of up to 3 words / 16 chars
  const ch=[];let cur=[];for(let k=0;k<ws.length;k++){const len=cur.reduce((a,j)=>a+ws[j].t.length+1,0)+ws[k].t.length;if(cur.length&&(cur.length>=3||len>16)){ch.push(cur);cur=[]}cur.push(k);}if(cur.length)ch.push(cur);
  let ci=0;if(n>0){ci=ch.findIndex(c=>c.includes(n-1));}const cw=ch[ci]||[];const cn=n>0?(n-1)-cw[0]+1:0;
  const st={words:cw.slice(0,cn).map(k=>ws[k]),n:cn,pop};
  if(ln.count){const c=ln.count;const u=(lt-(c.at??.3))/(c.dur??1.4);if(u>=0){st.count=fmt((c.from||0)+(c.to-(c.from||0))*eo(u),c);if(c.suf2)st.count+=`<i>${c.suf2}</i>`;st.clabel=c.label||'';st.cpop=+(1-.25*(1-eo(u*4))).toFixed(2);st.countTop=i===0?560:230;}}
  states.push(st);}
const key=s=>JSON.stringify([s.n,s.pop,s.count,s.cpop,s.words.map(w=>w.t).join(' '),s.countTop]);
const uniq=[];for(const s of states){const k=key(s);if(uniq.length&&uniq.at(-1).k===k){uniq.at(-1).d++}else uniq.push({k,s,d:1});}
fs.mkdirSync(`${W}/kin`,{recursive:true});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('http://localhost:8766/engine/overlay.html');
let list='';for(let j=0;j<uniq.length;j++){const f=`${W}/kin/k${String(j).padStart(5,'0')}.png`;await p.evaluate(o=>window.draw(o),uniq[j].s);await p.screenshot({path:f,omitBackground:true});list+=`file '${f}'\nduration ${(uniq[j].d/FPS).toFixed(5)}\n`;}
list+=`file '${W}/kin/k${String(uniq.length-1).padStart(5,'0')}.png'\n`;fs.writeFileSync(`${W}/kin/list.txt`,list);
console.log('kin frames',uniq.length,'of',states.length);await b.close();
