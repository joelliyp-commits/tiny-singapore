// ===== Parametric scene templates (inserted into scene.html module scope) =====
const TPL = {};
function regTpl(name, opt, build) { TPL[name] = Object.assign({ cam: [V(-1, 5, 13), V(1, 4.4, 11.5), V(0, 1.6, 0), V(0, 1.8, 0)], k: 1.3, bg: 0xDCE8E4 }, opt, { build }); }
function lab(txt, h = .5, bg = '#FFF6E6', fg = '#2C5F5D') { const cw = Math.max(380, txt.length * 74 + 120); return sign(txt, cw / 240 * h, h, { w: cw, h: 240, size: 128, bg, fg, radius: 70 }); }
function bigTag(txt, col = C.gold, fg = '#2C5F5D') { const g = new THREE.Group(); const w = Math.max(1.6, txt.length * .27 + .7); g.add(rbox(w, 1.05, .16, col, .2)); const s = sign(txt, w - .2, .8, { w: Math.round((w - .2) / .8 * 300), h: 300, size: 190, bg: null, fg }); s.position.z = .09; s.position.x = .12; g.add(s); const hole = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 8, 20), mat(C.cream)); hole.position.set(-w / 2 + .22, .3, .1); g.add(hole); return g; }
function bld(type) {
  if (type === 'hdb') return hdb(2.4, 1.3, .7);
  if (type === 'bto') return hdb(2.6, 1.3, .7, '#6FA9A5');
  if (type === 'condo') return condo(3.4, .95);
  if (type === 'ec') { const c = condo(2.8, .95); c.children[1].material = mat(C.gold); return c; }
  if (type === 'landed') return landed(0xD98C5F);
  if (type === 'car') { const g = new THREE.Group(); g.add(at(rbox(1.5, .4, .75, C.coral, .14), 0, .38, 0)); g.add(at(rbox(.85, .32, .68, C.cream, .12), -.05, .72, 0)); for (const x of [-.48, .48]) for (const z of [-.38, .38]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .12, 18), mat(0x333333)); w.rotation.x = Math.PI / 2; w.position.set(x, .18, z); w.castShadow = true; g.add(w); } return g; }
  if (type === 'land') { const g = new THREE.Group(); g.add(at(rbox(2.2, .08, 1.8, 0xC9AE85, .03), 0, .05, 0)); for (let i = 0; i < 4; i++) g.add(at(rbox(.04, .3, 1.8, 0xE7E2D8, .01), -1.1 + i * .73, .15, 0)); return g; }
  return new THREE.Group();
}
const popIn = (o, lt, d = 0, s = 1) => o.scale.setScalar(Math.max(.001, back((lt - d) / .4)) * s);

// 1. tag: building + big floating tag + optional arrow
regTpl('tag', {}, (g, p) => {
  g.add(plate(8, 7)); const b = bld(p.bld || 'none'); b.position.set(p.fam === false ? 0 : -1.2, 0, -1.4); g.add(b);
  let fam = null; if (p.fam !== false) { fam = family(); fam.scale.setScalar(1.4); fam.position.set(1.5, 0, 1); g.add(fam); }
  const tag = bigTag(p.text || '', p.down ? C.cream : C.gold); tag.position.set(.6, 3.3, .3); g.add(tag);
  let ar = null; if (p.dir) { ar = arrowUp(1.6, p.dir === 'down' ? 0x8E7F70 : C.coral); if (p.dir === 'down') { ar.rotation.z = Math.PI; ar.position.set(2.9, 3.2, .3); } else ar.position.set(2.9, 1.2, .3); g.add(ar); }
  for (const [x, z] of [[-3.1, 2.4], [3.2, -2.4], [-3.2, -2.5]]) g.add(at(tree(1.1), x, 0, z));
  return { anim: (lt) => { popIn(tag, lt, .2); tag.position.y = 3.3 + Math.sin(lt * 2) * .08; tag.rotation.y = Math.sin(lt * 1.3) * .15; if (ar) popIn(ar, lt, .7); if (fam) fam.rotation.y = Math.sin(lt * .9) * .25; } };
});
// 2. bank: bank building + stamp NO/OK
regTpl('bank', { bg: 0xE7E0D1 }, (g, p) => {
  g.add(plate(8, 7)); const bk = new THREE.Group(); bk.add(at(rbox(3.4, .3, 1.8, C.cream, .05), 0, .15, 0)); for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 1.6, 16), mat(0xF2ECE0)); c.position.set(-1.3 + i * .65, 1.1, .6); c.castShadow = true; bk.add(c); }
  bk.add(at(rbox(3.2, 1.6, 1, 0xE9DFCF, .04), 0, 1.1, -.2)); const ped = new THREE.Mesh(new THREE.CylinderGeometry(.01, 2, .7, 3), mat(C.dteal)); ped.rotation.y = Math.PI / 6 + Math.PI / 2; ped.scale.set(1, 1, .5); ped.position.set(0, 2.25, .1); ped.castShadow = true; bk.add(ped);
  const s = lab('BANK', .4, '#2C5F5D', '#fff'); s.position.set(0, 1.95, .72); bk.add(s); bk.position.set(0, 0, -1.4); g.add(bk);
  const fam = family(); fam.scale.setScalar(1.4); fam.position.set(-1.6, 0, 1.4); g.add(fam);
  const ok = p.stamp === 'OK'; const st = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .12, 40), mat(ok ? 0x3E8E6A : C.red)); disc.rotation.x = Math.PI / 2; disc.castShadow = true; st.add(disc); const t = sign(ok ? 'OK' : 'NO', 1, .6, { w: 400, h: 240, size: 170, bg: null, fg: '#fff' }); t.position.z = .08; st.add(t); st.position.set(1.7, 3.1, .6); g.add(st);
  if (p.text) { const l = lab(p.text, .42); l.position.set(1.7, 2.1, .7); g.add(l); }
  return { anim: (lt) => { st.scale.setScalar(Math.max(.001, back((lt - .5) / .35)) * 1); st.rotation.z = Math.sin(lt * 3) * .06 * (lt > .9 ? 1 : 0); fam.children.forEach((c, j) => c.position.y = 0); } };
});
// 3. bars: generic bar chart with labels
regTpl('bars', { bg: 0xE2E7E2, k: 1.25 }, (g, p) => {
  g.add(plate(8, 6)); const vals = p.vals || [1, 2, 3]; const n = vals.length; const mx = Math.max(...vals.map(Math.abs)); const sp = Math.min(1.3, 5.2 / n); const bars = [];
  vals.forEach((v, i) => { const h = Math.max(.1, Math.abs(v) / mx * 3); const col = (p.cols && p.cols[i]) ? p.cols[i] : (i === n - 1 ? C.coral : C.teal); const b = rbox(sp * .7, h, sp * .7, col, .06); const x = -(n - 1) * sp / 2 + i * sp; b.position.set(x, h / 2, -.3); b.userData.h = h; g.add(b); bars.push(b);
    if (p.labels && p.labels[i]) { const l = lab(p.labels[i], .32); l.position.set(x, .4, .75); l.rotation.x = -.5; const maxW = sp * .98; const w = l.geometry.parameters.width; if (w > maxW) l.scale.setScalar(maxW / w); g.add(l); } });
  return { anim: (lt) => bars.forEach((b, k) => { const s = Math.max(.001, eo((lt - .1 - k * .15) / .45)); b.scale.y = s; b.position.y = b.userData.h * s / 2; }) };
});
// 4. versus: two buildings with tags and a gap badge
regTpl('versus', { bg: 0xE9E1CF }, (g, p) => {
  g.add(plate(8, 6.5)); const L = p.l || {}, R = p.r || {}; const items = [];
  for (const [side, d] of [[-1, L], [1, R]]) { const b = bld(d.type || 'condo'); b.position.set(side * 1.7, 0, -1.2); g.add(b); const nm = lab(d.label || '', .36, side < 0 ? '#2C5F5D' : '#E0714F', '#fff'); const w = nm.geometry.parameters.width; if (w > 2.9) nm.scale.setScalar(2.9 / w); nm.position.set(side * 1.7, .45, .9); nm.rotation.x = -.45; g.add(nm);
    const tg = bigTag(d.price || '', side < 0 ? C.cream : C.gold); const tw = tg.children[0].geometry.parameters.width; tg.userData.s0 = tw > 2.3 ? 2.3 / tw : 1; tg.position.set(side * 1.55, 4.2, -.6); g.add(tg); items.push(tg); }
  let badge = null; if (p.badge) { badge = lab(p.badge, .55, '#24504d', '#FFD36B'); badge.position.set(0, 2.4, .9); g.add(badge); }
  return { anim: (lt) => { items.forEach((t, k) => { t.scale.setScalar(Math.max(.001, back((lt - .2 - k * .3) / .4)) * t.userData.s0); t.position.y = 4.2 + Math.sin(lt * 2 + k) * .07; }); if (badge) popIn(badge, lt, .9); } };
});
// 5. signpost: two choices + family + optional buildings
regTpl('signpost', { bg: 0xE6DDCB, k: 1.2, cam: [V(-1.2, 3.8, 11), V(.4, 3.3, 9.5), V(0, 1.6, 0), V(0, 1.7, 0)] }, (g, p) => {
  g.add(plate(8, 7)); if (p.l) { const b = bld(p.l); b.position.set(-2.2, 0, -1.6); g.add(b); } if (p.r) { const b = bld(p.r); b.position.set(2.2, 0, -1.6); g.add(b); }
  const fam = family(); fam.scale.setScalar(1.6); fam.position.set(0, 0, 1.1); g.add(fam); const post = rbox(.12, 2.4, .12, C.trunk, .03); post.position.set(0, 1.2, -.4); g.add(post);
  const a = lab('◀ ' + (p.a || 'A'), .48, '#2C5F5D', '#fff'); a.position.set(-.1 - a.geometry.parameters.width / 2 + .2, 2.15, -.32); g.add(a);
  const b2 = lab((p.b || 'B') + ' ▶', .48, '#E0714F', '#fff'); b2.position.set(.1 + b2.geometry.parameters.width / 2 - .2, 1.6, -.32); g.add(b2);
  const q = sign('?', 1, 1, { w: 256, h: 256, size: 230, bg: null, fg: '#FFD36B' }); q.position.set(0, 3.1, .8); g.add(q);
  return { anim: (lt) => { popIn(q, lt, .5); q.position.y = 3.1 + Math.sin(lt * 2.5) * .1; fam.rotation.y = Math.sin(lt * .9) * .35; a.rotation.z = Math.sin(lt * 2) * .04; b2.rotation.z = -Math.sin(lt * 2) * .04; } };
});
// 6. dominoes
regTpl('dominoes', { bg: 0xD3E5DE, cam: [V(-4, 4.5, 11), V(-2, 4, 10), V(0, 1.4, 0), V(.3, 1.5, 0)] }, (g, p) => {
  g.add(plate(9, 6)); const labs = p.labels || ['HDB', 'EC', 'CONDO']; const cols = [0x6FA9A5, C.gold, C.coral]; const ds = [];
  labs.forEach((t, i) => { const piv = new THREE.Group(); piv.position.set(-2.4 + i * 2.4, 0, 0); piv.position.x += .25; const d = rbox(.5, 2.6, 1.5, cols[i % 3], .08); d.position.set(-.25, 1.3, 0); piv.add(d); const s = sign(t, 1.3, .5, { w: 520, h: 200, size: 120, bg: '#FFF6E6', fg: '#2C5F5D', radius: 40 }); s.rotation.y = Math.PI / 2; s.position.set(0.02, 1.8, 0); piv.add(s); g.add(piv); ds.push(piv); });
  let q = null; if (p.q) { q = sign('?', 1, 1, { w: 256, h: 256, size: 230, bg: null, fg: '#FFD36B' }); q.position.set(0, 3.6, 0); g.add(q); }
  return { anim: (lt) => { ds.forEach((d, i) => { if (p.fall === false) { d.rotation.z = Math.sin(lt * 2 + i) * .03; return; } const t = cl((lt - .5 - i * .55) / .45); d.rotation.z = -t * t * 1.05; }); if (q) popIn(q, lt, .4); } };
});
// 7. gov: government building + BTO blocks rising
regTpl('gov', { bg: 0xD7E4E5 }, (g, p) => {
  g.add(plate(9, 7)); const gv = new THREE.Group(); gv.add(at(rbox(2.4, 1.3, 1.3, C.cream, .05), 0, .65, 0)); const dome = new THREE.Mesh(new THREE.SphereGeometry(.65, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.teal)); dome.position.y = 1.3; dome.castShadow = true; gv.add(dome);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .8, 6), mat(0x888888)); pole.position.y = 2.3; gv.add(pole); const flag = rbox(.45, .28, .02, C.red, .01); flag.position.set(.24, 2.55, 0); gv.add(flag); gv.position.set(-2.4, 0, -1.2); g.add(gv);
  const blocks = []; for (let i = 0; i < 6; i++) { const b = hdb(1.4 + (i % 2) * .5, .8, .5, '#6FA9A5'); b.position.set(.3 + (i % 3) * 1.1, 0, -1.6 + Math.floor(i / 3) * 1.4); g.add(b); blocks.push(b); }
  const l = lab(p.text || 'NEW BTO', .42, '#E0714F', '#fff'); l.position.set(1.4, 3.3, -.5); g.add(l);
  return { anim: (lt) => { blocks.forEach((b, k) => b.scale.y = Math.max(.001, back((lt - .2 - k * .12) / .4))); popIn(l, lt, .9); flag.rotation.y = Math.sin(lt * 4) * .3; } };
});
// 8. cpf: sold HDB, coins flow to CPF vault
regTpl('cpf', { bg: 0xEDE3D0 }, (g, p) => {
  g.add(plate(9, 7)); const h = hdb(2.2, 1.2, .7); h.position.set(-2.4, 0, -1.2); g.add(h); const sold = lab(p.left || 'SOLD', .42, '#2C5F5D', '#fff'); sold.position.set(-2.4, 2.75, -.7); g.add(sold);
  const v = new THREE.Group(); v.add(at(rbox(1.8, 1.6, 1.4, 0x6FA9A5, .12), 0, .8, 0)); const door = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .1, 32), mat(0xB8C4C6, { metalness: .5, roughness: .3 })); door.rotation.x = Math.PI / 2; door.position.set(0, .85, .72); v.add(door); const vl = lab(p.label || 'CPF', .42, '#E0714F', '#fff'); vl.position.set(0, 1.95, .2); v.add(vl); v.position.set(2.4, 0, -1); g.add(v);
  const coins = []; for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .07, 20), mat(C.gold, { metalness: .3, roughness: .4 })); c.castShadow = true; g.add(c); coins.push(c); }
  let rt = null; if (p.right) { rt = bigTag(p.right); rt.position.set(2.4, 3.4, -.6); rt.scale.setScalar(.8); g.add(rt); }
  return { anim: (lt) => { coins.forEach((c, k) => { const ph = ((lt * .45 + k / 8) % 1); c.position.set(-2.2 + ph * 4.4, .6 + Math.sin(ph * Math.PI) * 2.2, 0); c.rotation.x = ph * 6; }); if (rt) { rt.scale.setScalar(Math.max(.001, back((lt - .6) / .4)) * .8); } } };
});
// 9. lease: old HDB + big clock
regTpl('lease', { bg: 0xE4E6E0 }, (g, p) => {
  g.add(plate(8, 7)); const h = hdb(2.4, 1.4, .8, '#B8A890'); h.position.set(-1.4, 0, -1.4); g.add(h);
  const ck = new THREE.Group(); const face = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .18, 48), mat(C.cream)); face.rotation.x = Math.PI / 2; face.castShadow = true; ck.add(face); const rim = new THREE.Mesh(new THREE.TorusGeometry(1, .09, 12, 48), mat(C.dteal)); ck.add(rim);
  for (let i = 0; i < 12; i++) { const m = rbox(.05, .16, .03, C.dteal, .01); const a = i / 12 * Math.PI * 2; m.position.set(Math.sin(a) * .8, Math.cos(a) * .8, .1); m.rotation.z = -a; ck.add(m); }
  const hh = rbox(.07, .5, .03, 0x333333, .02); hh.geometry.translate(0, .22, 0); hh.position.z = .13; ck.add(hh); const mh = rbox(.05, .72, .03, C.coral, .02); mh.geometry.translate(0, .33, 0); mh.position.z = .15; ck.add(mh);
  ck.position.set(1.6, 2.6, -.4); g.add(ck); const l = lab(p.yrs || '54 YRS LEFT', .45, '#E0714F', '#fff'); l.position.set(1.6, 1.2, .3); g.add(l);
  for (const [x, z] of [[-3.1, 2.3], [3.1, 2.4]]) g.add(at(tree(1.1), x, 0, z));
  return { anim: (lt) => { mh.rotation.z = -lt * 3; hh.rotation.z = -lt * .25; popIn(l, lt, .5); } };
});
// 10. developer: land plot -> condo, x2.2
regTpl('developer', { bg: 0xD7E4E5 }, (g, p) => {
  g.add(plate(9, 7)); const land = bld('land'); land.position.set(-2, 0, -.6); g.add(land); const cr = crane(); cr.position.set(-2.6, 0, -1.3); cr.scale.setScalar(.8); g.add(cr);
  const lt1 = bigTag(p.land || 'LAND', C.cream); lt1.scale.setScalar(.75); lt1.position.set(-2, 2.9, .4); g.add(lt1);
  const c = condo(3.6, 1); c.position.set(2.2, 0, -1.2); g.add(c); const st = bigTag(p.sell || '$?', C.gold); st.scale.setScalar(.75); st.position.set(2.2, 4.4, -.6); g.add(st);
  const mult = lab(p.mult || '× 2.2', .55, '#24504d', '#FFD36B'); mult.position.set(0, 2.2, .9); g.add(mult); const dev = person(C.dteal, 1.4); dev.position.set(-.6, 0, 1.6); g.add(dev);
  return { anim: (lt) => { c.scale.y = Math.max(.001, eo((lt - .4) / .9)); popIn(lt1, lt, .1, .75); popIn(st, lt, 1.2, .75); popIn(mult, lt, .8); cr.userData.jib.rotation.y = lt * .5; } };
});
// 11. rent: family with suitcase + rented flat, BTO under construction behind
regTpl('rent', { bg: 0xDCE6E0 }, (g, p) => {
  g.add(plate(9, 7)); const r = hdb(1.8, 1.2, .6, '#B8A890'); r.position.set(-2.2, 0, -.6); g.add(r); const rs = lab('RENT', .42, '#C8423B', '#fff'); rs.position.set(-2.2, 2.25, -.2); g.add(rs);
  const site = bld('land'); site.position.set(2, 0, -1.6); g.add(site); const cr = crane(); cr.position.set(1.4, 0, -2.2); g.add(cr); const b = hdb(1.2, 1.2, .6, '#6FA9A5'); b.position.set(2.2, 0, -1.4); g.add(b);
  const cal = calBlock(p.cal || '3-4 YRS', 1.4, 1.3); cal.position.set(2.2, 3.4, 0); g.add(cal);
  const fam = family(); fam.scale.setScalar(1.4); fam.position.set(-.4, 0, 1.4); g.add(fam); const sc = rbox(.35, .45, .2, C.coral, .05); sc.position.set(.35, .25, 1.5); g.add(sc);
  return { anim: (lt) => { cr.userData.jib.rotation.y = lt * .5; b.scale.y = .3 + .7 * eo(lt / 3); popIn(cal, lt, .5); } };
});
// 12. wave: many HDB with FOR SALE popping
regTpl('wave', { bg: 0xD7E4E5, k: 1.35 }, (g, p) => {
  g.add(plate(10, 7)); const signs = []; for (let i = 0; i < 9; i++) { const x = -3.2 + (i % 3) * 3.2, z = -2 + Math.floor(i / 3) * 1.9; const h = hdb(1.3 + (i % 2) * .4, 1, .5); h.position.set(x, 0, z); g.add(h); const fs = forSale(); fs.scale.setScalar(.8); fs.position.set(x + .8, 0, z + .5); g.add(fs); signs.push(fs); }
  const l = lab(p.n || '13,500 FLATS', .5, '#E0714F', '#fff'); l.position.set(0, 3.4, 0); g.add(l);
  return { anim: (lt) => { signs.forEach((s, k) => s.scale.setScalar(Math.max(.001, back((lt - .2 - k * .12) / .35)) * .8)); popIn(l, lt, 1.2); } };
});
// 13. hesitate: sales gallery, family paused with ?
regTpl('hesitate', { bg: 0xE7E0D1 }, (g, p) => {
  g.add(plate(9, 8)); const gal = gallery(); gal.position.set(0, 0, -1.6); g.add(gal); const fam = family(); fam.scale.setScalar(1.5); fam.position.set(-1.2, 0, 1.6); g.add(fam);
  const q = sign('?', 1, 1, { w: 256, h: 256, size: 230, bg: null, fg: '#FFD36B' }); q.position.set(-1.2, 2.4, 1.6); g.add(q);
  const l = lab(p.text || 'RATES ↑', .5, '#E0714F', '#fff'); l.position.set(2, 2.8, 0); g.add(l);
  return { anim: (lt) => { fam.position.x = -2.4 + eo(lt / 1.2) * 1.2; popIn(q, lt, 1.2); q.position.y = 2.4 + Math.sin(lt * 2.5) * .08; popIn(l, lt, .4); } };
});
// 14. tower: condo stack with highlighted floors, side tags, badge
regTpl('tower', { bg: 0xE3E6E1, k: 1.3, cam: [V(-1, 6.2, 12.2), V(.8, 5.8, 11), V(0, 2.8, 0), V(0, 3, 0)] }, (g, p) => {
  g.add(plate(9, 7)); const N = 13, FH = .4, base = .1; const hl = p.hl || {}; const slabs = {};
  for (let f = 1; f <= N; f++) { const y = base + (f - .5) * FH; const c = hl[f] === 'g' ? 0x3E8E6A : hl[f] === 'r' ? C.red : C.cream;
    const m = mat(c, hl[f] ? { emissive: c, emissiveIntensity: 0 } : {}); const s = new THREE.Mesh(new THREE.BoxGeometry(2.1, FH * .78, 1.6), m); s.position.set(0, y, -1); s.castShadow = true; s.receiveShadow = true; g.add(s);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(2.14, FH * .22, 1.64), mat(hl[f] ? c : C.glass)); gl.position.set(0, y + FH * .5, -1); g.add(gl); if (hl[f]) slabs[f] = s;
    if (hl[f]) { const n = sign(String(f), .6, .34, { w: 260, h: 150, size: 130, bg: null, fg: '#fff' }); n.position.set(0, y, -.19); g.add(n); } }
  const roof = rbox(2.3, .16, 1.8, C.gold, .04); roof.position.set(0, base + N * FH + .07, -1); g.add(roof);
  const tags = []; (p.tags || []).forEach((t, i) => { const y = base + (t.f - .5) * FH; const side = t.side || (i ? 1 : -1); const tg = bigTag(t.text, t.col === 'r' ? C.coral : t.col === 'g' ? 0x7CC49A : C.gold); const tw = tg.children[0].geometry.parameters.width; const s0 = Math.min(.7, 1.45 / tw); tg.userData.s0 = s0; tg.userData.y = y + (side < 0 ? .55 : -.15); tg.position.set(side * 2.1, tg.userData.y, -.6); g.add(tg); const ln = rbox(.9, .04, .04, 0x8E7F70, .01); ln.position.set(side * 1.45, y, -.4); g.add(ln); tags.push(tg); });
  let badge = null; if (p.badge) { badge = lab(p.badge, .5, '#24504d', '#FFD36B'); const w = badge.geometry.parameters.width; if (w > 4) badge.scale.setScalar(4 / w); badge.position.set(0, .55, 1.4); badge.rotation.x = -.35; g.add(badge); }
  for (const [x, z] of [[-3.2, 2.2], [3.2, 2.3], [-3.1, -2.3], [3.1, -2.4]]) g.add(at(tree(1), x, 0, z));
  return { anim: (lt) => { Object.values(slabs).forEach(s => s.material.emissiveIntensity = .25 + .2 * Math.sin(lt * 4)); tags.forEach((t, k) => { t.scale.setScalar(Math.max(.001, back((lt - .3 - k * .35) / .4)) * t.userData.s0); t.position.y = t.userData.y + Math.sin(lt * 2 + k) * .05; }); if (badge) popIn(badge, lt, .9, badge.scale.x > 0 && badge.userData.s ? badge.userData.s : Math.min(1, 4 / badge.geometry.parameters.width)); } };
});
// 15. township: estate growing in stages (0 land, 1 MRT+flats, 2 waterway/park, 3 mall+towers)
regTpl('township', { bg: 0xDCE8E4, k: 1.3, cam: [V(-.8, 8.6, 10.2), V(.6, 8.2, 9.2), V(0, .9, -.2), V(0, 1.1, -.2)] }, (g, p) => {
  g.add(plate(7.4, 7.6)); const S = p.stage || 0; const items = [];
  const add = (o, st) => { g.add(o); if (st === S) items.push(o); return o; };
  for (const [x, z] of [[-1.9, -2.2], [0, -2.4], [1.9, -2.2]]) { const l = bld('land'); l.position.set(x, 0, z); l.scale.set(.75, 1, .6); g.add(l); }
  if (p.graves) for (let i = 0; i < 12; i++) { const s = rbox(.16, .28, .08, 0x9E988E, .03); s.position.set(.3 + (i % 4) * .5, .14, -.2 + Math.floor(i / 4) * .5); g.add(s); }
  if (p.mrt) { const st = new THREE.Group(); for (let i = -3; i <= 3; i += 1.5) st.add(at(rbox(.16, .55, .16, 0xBFB8AC, .02), i, .27, 0)); st.add(at(rbox(7.2, .12, .45, 0xE9E3D6, .04), 0, .6, 0)); st.add(at(rbox(1.6, .5, .8, C.cream, .06), -1.5, .92, 0)); st.add(at(rbox(1.8, .1, 1, C.teal, .03), -1.5, 1.22, 0)); const ml = lab('MRT', .36, '#2C5F5D', '#fff'); ml.position.set(-1.5, 1.6, .2); st.add(ml); st.position.z = 2.8; add(st, 1);
    if (p.mrt === 'closed') { const x = lab('CLOSED', .5, '#C8423B', '#fff'); x.position.set(.6, 1.5, 3); add(x, S); } }
  const flats = p.graves ? [[-2.5, -1.9, 2], [-1.4, -2.2, 2.4]] : [[-2.5, -1.9, 2], [-1.4, -2.2, 2.4], [-2.5, -.5, 1.6], [-1.4, -.7, 1.9]];
  if (S >= 1) for (const [x, z, h] of flats) { const b = hdb(h, .85, .5, '#6FA9A5'); b.position.set(x, 0, z); add(b, 1); }
  if (S >= 2) { const w = rbox(7.2, .05, .7, 0x5FA8CC, .02); w.position.set(0, .06, 1.5); w.receiveShadow = true; add(w, 2); for (const x of [-3, -1.8, -.6, .6, 1.8, 3]) add(at(tree(.7), x, 0, 2.05), 2); }
  if (S >= 3) { const m = new THREE.Group(); m.add(at(rbox(1.7, .8, 1.1, 0xE9DFCF, .08), 0, .4, 0)); m.add(at(rbox(1.8, .12, 1.2, C.coral, .03), 0, .86, 0)); const ml = lab('MALL', .34, '#E0714F', '#fff'); ml.position.set(0, 1.25, .2); m.add(ml); m.position.set(0, 0, -.2); add(m, 3);
    for (const [x, z, h] of [[1.6, -2.1, 3], [2.6, -1.5, 2.4], [1.4, -.9, 2.1]]) { const c = condo(h, .75); c.position.set(x, 0, z); add(c, 3); }
    if (p.park) for (const [x, z] of [[2.5, .3], [3, -.3], [2, .5]]) add(at(tree(.9), x, 0, z), 3); }
  let tl = null; if (p.label) { tl = lab(p.label, .62, '#24504d', '#FFD36B'); const w = tl.geometry.parameters.width; tl.userData.s = w > 5.6 ? 5.6 / w : 1; tl.position.set(0, 4, -1.4); g.add(tl); }
  let tg = null; if (p.tag) { tg = bigTag(p.tag, C.gold); const tw = tg.children[0].geometry.parameters.width; tg.userData.s = Math.min(.85, 3.6 / tw); tg.position.set(.6, 2.7, .4); g.add(tg); }
  return { anim: (lt) => { items.forEach((o, k) => { if (!o.userData.s0) o.userData.s0 = o.scale.clone(); const s = Math.max(.001, back((lt - .2 - k * .08) / .45)); o.scale.set(o.userData.s0.x, o.userData.s0.y * s, o.userData.s0.z); }); if (tl) popIn(tl, lt, .1, tl.userData.s); if (tg) { popIn(tg, lt, .9, tg.userData.s); tg.position.y = 2.7 + Math.sin(lt * 2) * .07; } } };
});
// 16. wind: blocks with gaps, wind streaks flowing through; breezy vs stuffy stacks
regTpl('wind', { bg: 0xDDE9EC, k: 1.3, cam: [V(-1.2, 7.4, 10.6), V(.8, 7, 9.6), V(0, 1.1, 0), V(0, 1.3, 0)] }, (g, p) => {
  g.add(plate(7.6, 7.6)); const blocks = [[-2.3, 2.2], [-.78, 3.4], [.78, 1.6], [2.3, 2.8]];
  for (const [x, h] of blocks) { const c = condo(p.flat ? 2.2 : h, .85); c.position.set(x, 0, -1.6); g.add(c); }
  const front = []; for (const [x, lab2, col] of [[-1.55, 'BREEZY', '#2C5F5D'], [2.3, 'STUFFY', '#C8423B']]) { const c = condo(1.4, .75); c.position.set(x, 0, 1.4); g.add(c); front.push(c);
    if (p.labels) { const l = lab(lab2, .42, col, '#fff'); l.position.set(x > 0 ? 1.9 : x, 2.25, 1.6); g.add(l); } }
  let nb = null; if (p.next) { nb = condo(2, .85); nb.position.set(-1.55, 0, -.1); g.add(nb); const q = lab('?', .5, '#E0714F', '#fff'); q.position.set(-1.7, 2.6, -.1); nb.add(q); q.position.set(0, 2.6, 0); }
  const sm = new THREE.MeshStandardMaterial({ color: 0x4FA3D1, emissive: 0x2E86C1, emissiveIntensity: .35, transparent: true, opacity: .9, roughness: .3 }); const streaks = [];
  const lanes = [-1.55, 0, 1.55]; for (let i = 0; i < 30; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.13, .1, 1.1), sm); s.castShadow = false; const lane = lanes[i % 3]; s.userData = { x: lane + (Math.random() - .5) * .45, y: .4 + Math.random() * 1.4, ph: Math.random(), down: i % 3 === 1 && !p.flat }; g.add(s); streaks.push(s); }
  let tg = null; if (p.tag) { tg = lab(p.tag, .5, '#24504d', '#FFD36B'); const w = tg.geometry.parameters.width; tg.userData.s = w > 5.8 ? 5.8 / w : 1; tg.position.set(0, 4.3, -1.2); g.add(tg); }
  return { anim: (lt) => { streaks.forEach(s => { const u = (lt * .45 + s.userData.ph) % 1; const z = -3.6 + u * 7.2; let y = s.userData.y; if (s.userData.down && z < -1) y = s.userData.y + 2 * (-1 - z) / 2.6; s.position.set(s.userData.x, Math.max(.3, y), z);
        const blocked = p.next && Math.abs(s.userData.x + 1.55) < .5 && z > -.6; const toStuffy = false; s.visible = !blocked && !toStuffy; s.scale.z = .6 + .4 * Math.sin(u * Math.PI); });
      if (tg) popIn(tg, lt, .2, tg.userData.s); if (nb) nb.scale.y = Math.max(.001, back((lt - .6) / .5)); } };
});



