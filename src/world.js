import * as THREE from 'three';
import { mat, shadowy } from './materials.js';

// Planetinhos: fazenda, savana e floresta encantada.
// Cada mundo é um Group centrado em (0, -PR, 0); o bichinho fica no topo e o mundo gira.

// ================= mundinhos =================
export const PR = 6.5;
export const UP = new THREE.Vector3(0, 1, 0);
export function place(obj, d, lift=0, parent, spin=Math.random()*6.283){
  const h = new THREE.Group();
  h.position.copy(d).multiplyScalar(PR + lift);
  h.quaternion.setFromUnitVectors(UP, d);
  h.rotateY(spin);
  h.add(obj); parent.add(h); return h;
}
export const randDir = () => {
  let v; do { v = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1); }
  while (v.lengthSq() > 1 || v.lengthSq() < 0.01);
  return v.normalize();
};
export const winDay = new THREE.Color(0xa8dcff), winNight = new THREE.Color(0xffd36b);
const dotMat = new THREE.MeshBasicMaterial({ color:0xffffff });
const flyMat = new THREE.MeshBasicMaterial({ color:0xfff4a0, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false });

export function makeWorld(kind, scene){
  const farm = kind === 'farm';
  const g = new THREE.Group(); g.position.set(0, -PR, 0); scene.add(g);
  const W = { kind, group:g, flowers:[], flies:[], wins:[], critters:[], glows:[], pop:0 };
  const glow = hex => { const m = new THREE.MeshBasicMaterial({ color:hex }); W.glows.push({ m, c:new THREE.Color(hex) }); return m; };
  const P = (o, d, l=0) => place(o, d, l, g);
  const S3 = (geo, m) => shadowy(new THREE.Mesh(geo, m));

  // chão
  const gGeo = new THREE.SphereGeometry(PR, 96, 64);
  const pal = { farm:[0x8fd46a, 0x72bf56, 0xaee283], savanna:[0xd2a64c, 0xb58a3c, 0xe2bf66], forest:[0x78c99e, 0x5fb189, 0x98dfb6] }[kind];
  const cA = new THREE.Color(pal[0]), cB = new THREE.Color(pal[1]), cC = new THREE.Color(pal[2]);
  const pa = gGeo.attributes.position, cols = [];
  const f1 = farm ? 5.1 : 3.3, f2 = farm ? 4.7 : 6.1;
  for (let i=0;i<pa.count;i++){
    const x = pa.getX(i)/PR, y = pa.getY(i)/PR, z = pa.getZ(i)/PR;
    const n = Math.sin(x*f1 + y*2.3) * Math.sin(z*f2 - x*1.9) * 0.6 + Math.sin(y*9 + z*7) * 0.2;
    const c = n > 0 ? cA.clone().lerp(cC, Math.min(1, n)) : cA.clone().lerp(cB, Math.min(1, -n*1.4));
    cols.push(c.r, c.g, c.b);
  }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const earth = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.95 }));
  earth.receiveShadow = true; g.add(earth);

  // lago (na savana é o bebedouro)
  W.pondDir = ({ farm:new THREE.Vector3(-0.55, 0.72, -0.42), savanna:new THREE.Vector3(0.62, 0.68, -0.4), forest:new THREE.Vector3(0.35, 0.7, -0.62) })[kind].normalize();
  W.pondAng = ({ farm:3.6, savanna:3.3, forest:3.3 })[kind] / PR;
  const pondG = new THREE.Group(); pondG.quaternion.setFromUnitVectors(UP, W.pondDir); g.add(pondG);
  const cap = (r, a) => new THREE.SphereGeometry(r, 72, 14, 0, Math.PI*2, 0, a);
  const rim = new THREE.Mesh(cap(PR + 0.012, W.pondAng + 0.05), mat({ farm:0xd9c9a3, savanna:0xae8a5c, forest:0xa7afc8 }[kind], 1)); rim.receiveShadow = true; pondG.add(rim);
  const water = new THREE.Mesh(cap(PR + 0.03, W.pondAng), mat({ farm:0x5cc0ee, savanna:0x6fb6c6, forest:0x5a8ff0 }[kind], 0.25)); water.receiveShadow = true; pondG.add(water);
  const sph = (a, b) => new THREE.Vector3(Math.sin(a)*Math.cos(b), Math.cos(a), Math.sin(a)*Math.sin(b));
  if (kind !== 'savanna'){
    [[0.3,0.4,0.48],[0.4,2.2,0.38],[0.18,3.6,0.3],[0.42,4.6,0.36],[0.25,5.6,0.3]].forEach(([a,b,r])=>{
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0.4, Math.PI*2-0.8), mat(0x3f9e45, 0.9));
      pad.rotation.x = -Math.PI/2; const ph = place(pad, sph(a,b), 0.045, pondG);
      if (kind === 'forest'){ const bl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), glow(0xff9ad8)); bl.scale.y = 0.6; bl.position.y = 0.05; ph.add(bl); }
    });
  } else {
    for (let i=0;i<9;i++){
      const sz = 0.15 + Math.random()*0.15;
      const r = S3(new THREE.DodecahedronGeometry(sz, 0), mat(0xb59a78, 1)); r.position.y = sz*0.4;
      place(r, sph(W.pondAng + 0.05, i/9*Math.PI*2 + Math.random()*0.3), 0, pondG);
    }
  }

  const used = [];
  function freeDir(sep=0.2, pref){
    if (pref){ const d = pref.clone().normalize(); used.push(d); return d; }
    for (let k=0;k<500;k++){
      const d = randDir();
      if (d.angleTo(W.pondDir) < W.pondAng + 0.1) continue;
      if (d.angleTo(UP) < 0.35) continue;
      if (used.some(u => u.angleTo(d) < sep)) continue;
      used.push(d); return d;
    }
    return randDir();
  }
  function flower(color, i, lit){
    const f = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.6,6), mat(0x4c9a3c));
    stem.position.y = 0.3; f.add(stem);
    const center = S3(new THREE.SphereGeometry(0.1,12,10), mat(0xffc93c)); center.position.y = 0.62; f.add(center);
    const pm = lit ? glow(color) : mat(color);
    for (let k=0;k<5;k++){
      const a = k/5*Math.PI*2;
      const p = S3(new THREE.SphereGeometry(0.12,10,8), pm);
      p.scale.set(1,0.45,1); p.position.set(Math.cos(a)*0.17, 0.62, Math.sin(a)*0.17); f.add(p);
    }
    f.userData.phase = i; W.flowers.push(f); return f;
  }
  function bush(color, n){
    for (let i=0;i<n;i++){
      const b = new THREE.Group();
      [[0,0.55,0,0.7],[0.55,0.4,0.2,0.5],[-0.45,0.4,0.25,0.5]].forEach(([bx,by,bz,br])=>{
        const m = S3(new THREE.SphereGeometry(br,18,14), mat(color, 0.9)); m.position.set(bx,by,bz); b.add(m);
      });
      b.scale.setScalar(0.55 + Math.random()*0.35); P(b, freeDir(0.3));
    }
  }
  function rocks(color, n){
    for (let i=0;i<n;i++){
      const sz = 0.22 + Math.random()*0.18;
      const r = S3(new THREE.DodecahedronGeometry(sz,0), mat(color, 1));
      r.position.y = sz*0.5; r.rotation.set(Math.random(),Math.random(),0); P(r, freeDir(0.2));
    }
  }

  if (farm){
    // celeiro vermelho
    {
      const b = new THREE.Group();
      const red = mat(0xd9453b, 0.75), trim = mat(0xfff6ea, 0.7);
      const walls = S3(new THREE.BoxGeometry(1.7, 1.1, 1.3), red); walls.position.y = 0.55; b.add(walls);
      const rg = new THREE.CylinderGeometry(0.85, 0.85, 1.85, 3); rg.rotateY(Math.PI/2); rg.rotateZ(Math.PI/2);
      const roof = S3(rg, mat(0x8a4b3a, 0.8)); roof.position.y = 1.525; b.add(roof);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.72), trim); frame.position.set(0.86, 0.4, 0); b.add(frame);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.6), mat(0xa8322b, 0.8)); door.position.set(0.875, 0.37, 0); b.add(door);
      [0.72, -0.72].forEach(a => { const x = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.06), trim); x.position.set(0.9, 0.37, 0); x.rotation.x = a; b.add(x); });
      const wm = new THREE.MeshBasicMaterial({ color:0xa8dcff }); W.wins.push(wm);
      const loft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.3), wm); loft.position.set(0.93, 1.42, 0); b.add(loft);
      P(b, freeDir(0.55, new THREE.Vector3(0.68, 0.72, 0.12)));
    }
    // silo
    {
      const si = new THREE.Group();
      const c = S3(new THREE.CylinderGeometry(0.42, 0.42, 1.9, 20), mat(0xd6d9dc, 0.6)); c.position.y = 0.95; si.add(c);
      [0.5, 1.35].forEach(y => { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.07, 20), mat(0xd9453b)); band.position.y = y; si.add(band); });
      const dome = S3(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI*2, 0, Math.PI/2), mat(0x9aa3ab, 0.5)); dome.position.y = 1.9; si.add(dome);
      P(si, freeDir(0.35, new THREE.Vector3(0.7, 0.5, -0.45)));
    }
    // casinha da fazenda
    {
      const hs = new THREE.Group();
      const walls = S3(new THREE.BoxGeometry(1.1, 0.85, 0.95), mat(0xfff1dc, 0.8)); walls.position.y = 0.42; hs.add(walls);
      const roof = S3(new THREE.ConeGeometry(0.95, 0.7, 4), mat(0x5b8fd9, 0.7)); roof.rotation.y = Math.PI/4; roof.position.y = 1.18; hs.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.04), mat(0x9a6a43)); door.position.set(0, 0.21, 0.48); hs.add(door);
      const wm = new THREE.MeshBasicMaterial({ color:0xa8dcff }); W.wins.push(wm);
      [-0.34, 0.34].forEach(x => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.04), wm); w.position.set(x, 0.52, 0.48); hs.add(w); });
      const chim = S3(new THREE.BoxGeometry(0.16, 0.36, 0.16), mat(0xc9a27e)); chim.position.set(0.3, 1.3, -0.15); hs.add(chim);
      P(hs, freeDir(0.45));
    }
    // fardos de feno
    for (let i=0;i<5;i++){
      const hb = new THREE.Group();
      const c = S3(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 18), mat(0xe8c65a, 0.95)); c.rotation.z = Math.PI/2; c.position.y = 0.3; hb.add(c);
      [-0.26, 0.26].forEach(x => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat(0xd4ad45)); e.rotation.y = Math.PI/2 * Math.sign(x); e.position.set(x, 0.3, 0); hb.add(e); });
      P(hb, freeDir(0.22));
    }
    // cerquinhas
    const wood = mat(0xc89b6a, 0.85);
    for (let i=0;i<7;i++){
      const fe = new THREE.Group();
      [-0.5, 0, 0.5].forEach(x => { const pst = S3(new THREE.BoxGeometry(0.08, 0.5, 0.08), wood); pst.position.set(x, 0.25, 0); fe.add(pst); });
      [0.18, 0.36].forEach(y => { const rl = S3(new THREE.BoxGeometry(1.1, 0.07, 0.05), wood); rl.position.y = y; fe.add(rl); });
      P(fe, freeDir(0.22));
    }
    // abóboras
    for (let i=0;i<7;i++){
      const pk = new THREE.Group();
      const b = S3(new THREE.SphereGeometry(0.22, 16, 12), mat(0xff8a1f, 0.6)); b.scale.set(1, 0.75, 1); b.position.y = 0.16; pk.add(b);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 6), mat(0x4c7a2c)); st.position.y = 0.36; pk.add(st);
      P(pk, freeDir(0.15));
    }
    // ovelhinhas
    for (let i=0;i<4;i++){
      const sh = new THREE.Group();
      const wool = mat(0xfafafa, 0.95), face = mat(0x3a3330, 0.7);
      [[0,0.55,0,0.36],[0.2,0.62,0.15,0.24],[-0.2,0.62,0.15,0.24],[0.2,0.62,-0.18,0.24],[-0.2,0.62,-0.18,0.24],[0,0.8,0,0.26]].forEach(([x,y,z,r])=>{
        const m = S3(new THREE.SphereGeometry(r, 14, 10), wool); m.position.set(x,y,z); sh.add(m);
      });
      [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([a,b]) => { const l = S3(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 6), face); l.position.set(a*0.16, 0.18, b*0.18); sh.add(l); });
      const hd = new THREE.Group(); hd.position.set(0, 0.62, 0.4); sh.add(hd);
      const hm = S3(new THREE.SphereGeometry(0.17, 14, 10), face); hm.scale.set(0.9, 1, 1.15); hm.position.z = 0.08; hd.add(hm);
      [-1,1].forEach(sd => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), face); ear.scale.set(1.6, 0.5, 0.8); ear.position.set(sd*0.17, 0.05, 0.02); hd.add(ear);
        const ey = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dotMat); ey.position.set(sd*0.07, 0.06, 0.24); hd.add(ey);
      });
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), wool); tuft.position.set(0, 0.15, 0.02); hd.add(tuft);
      const ph = Math.random()*6;
      W.critters.push(t => { hd.rotation.x = 0.35 + Math.sin(t*1.2 + ph) * 0.35; });
      P(sh, freeDir(0.3));
    }
    // macieiras
    for (let i=0;i<6;i++){
      const t = new THREE.Group();
      const trunk = S3(new THREE.CylinderGeometry(0.12, 0.17, 1, 10), mat(0x9a6a43, 0.9)); trunk.position.y = 0.5; t.add(trunk);
      const leaf = mat(i % 3 ? 0x4fa845 : 0x6cbf4c, 0.85);
      [[0,1.35,0,0.65],[0.35,1.1,0.1,0.45],[-0.32,1.15,-0.1,0.48],[0,1.75,0,0.42]].forEach(([x,y,z,r])=>{
        const m = S3(new THREE.SphereGeometry(r, 16, 12), leaf); m.position.set(x,y,z); t.add(m);
      });
      [[0.4,1.25,0.35],[-0.2,1.55,0.45],[0.1,1.0,0.55]].forEach(([x,y,z])=>{
        const ap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xff5a5a, 0.5)); ap.position.set(x,y,z); t.add(ap);
      });
      t.scale.setScalar(0.8 + Math.random()*0.35); P(t, freeDir(0.4));
    }
    bush(0x5cb04a, 5);
    rocks(0xb7b3ad, 4);
    const pc = [0xff8fb8, 0xffffff, 0xb79cff, 0xff9a5a, 0xffe066];
    for (let i=0;i<26;i++) P(flower(pc[i % pc.length], i), freeDir(0.15));
  } else if (kind === 'savanna') {
    // acácias
    for (let i=0;i<7;i++){
      const a = new THREE.Group();
      const bark = mat(0x7a5436, 0.9), leaf = mat(i % 2 ? 0x7f9c3c : 0x8fa845, 0.85);
      const tr = S3(new THREE.CylinderGeometry(0.07, 0.12, 1.7, 8), bark); tr.position.y = 0.85; tr.rotation.z = 0.08; a.add(tr);
      [-1,1].forEach(sd => { const br = S3(new THREE.CylinderGeometry(0.04, 0.06, 0.8, 6), bark); br.position.set(sd*0.25, 1.55, 0); br.rotation.z = -sd*0.75; a.add(br); });
      [[0,1.95,0,0.8],[0.62,1.86,0.2,0.55],[-0.6,1.88,-0.15,0.58]].forEach(([x,y,z,r]) => {
        const c = S3(new THREE.SphereGeometry(r, 18, 12), leaf); c.scale.set(1, 0.28, 1); c.position.set(x,y,z); a.add(c);
      });
      a.scale.setScalar(0.85 + Math.random()*0.35); P(a, freeDir(0.45, i === 0 ? new THREE.Vector3(-0.66, 0.74, 0.1) : undefined));
    }
    // baobás
    for (let i=0;i<2;i++){
      const bb = new THREE.Group();
      const bark = mat(0xa08676, 0.95), leaf = mat(0x6f9a3a, 0.85);
      const tr = S3(new THREE.CylinderGeometry(0.34, 0.52, 1.6, 16), bark); tr.position.y = 0.8; bb.add(tr);
      for (let k=0;k<6;k++){
        const pv = new THREE.Group(); pv.position.y = 1.55; pv.rotation.set(0, k/6*Math.PI*2, 0.6 + Math.random()*0.3); bb.add(pv);
        const br = S3(new THREE.CylinderGeometry(0.05, 0.09, 0.6, 6), bark); br.position.y = 0.28; pv.add(br);
        const bl = S3(new THREE.SphereGeometry(0.2, 10, 8), leaf); bl.position.y = 0.6; pv.add(bl);
      }
      P(bb, freeDir(0.5));
    }
    // capim alto
    const straw = [mat(0xe0b94a, 0.9), mat(0xb8902e, 0.9), mat(0xf0cf62, 0.9)];
    for (let i=0;i<46;i++){
      const tf = new THREE.Group();
      for (let k=0;k<5;k++){
        const h = 0.45 + Math.random()*0.4;
        const bl = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 5), straw[k % 3]);
        bl.castShadow = true; bl.position.set((Math.random()-.5)*0.18, h/2, (Math.random()-.5)*0.18);
        bl.rotation.set((Math.random()-.5)*0.5, 0, (Math.random()-.5)*0.5); tf.add(bl);
      }
      tf.userData.phase = i; W.flowers.push(tf);
      P(tf, freeDir(0.1));
    }
    // cupinzeiros
    for (let i=0;i<4;i++){
      const tm = new THREE.Group(); const clay = mat(0x9c6a45, 0.95);
      const c = S3(new THREE.ConeGeometry(0.42, 0.95, 10), clay); c.position.y = 0.47; tm.add(c);
      const c2 = S3(new THREE.ConeGeometry(0.18, 0.6, 8), clay); c2.position.set(0.25, 0.3, 0.05); tm.add(c2);
      const c3 = S3(new THREE.ConeGeometry(0.15, 0.45, 8), clay); c3.position.set(-0.2, 0.22, -0.12); tm.add(c3);
      P(tm, freeDir(0.25));
    }
    // pedrona
    {
      const rk = new THREE.Group(); const stone = mat(0xc9a070, 1);
      const a = S3(new THREE.DodecahedronGeometry(0.9, 0), stone); a.scale.set(1.5, 0.7, 1); a.position.y = 0.42; rk.add(a);
      const b = S3(new THREE.DodecahedronGeometry(0.6, 0), stone); b.position.set(0.95, 0.3, 0.35); rk.add(b);
      const c = S3(new THREE.DodecahedronGeometry(0.45, 0), stone); c.position.set(-0.9, 0.25, -0.3); rk.add(c);
      P(rk, freeDir(0.55, new THREE.Vector3(0.66, 0.74, 0.12)));
    }
    // cabana
    {
      const hut = new THREE.Group();
      const w = S3(new THREE.CylinderGeometry(0.55, 0.58, 0.7, 20), mat(0xd9b48a, 0.9)); w.position.y = 0.35; hut.add(w);
      const rf = S3(new THREE.ConeGeometry(0.82, 0.68, 20), mat(0xc8a24a, 0.95)); rf.position.y = 1.03; hut.add(rf);
      const dr = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.05), mat(0x6b4a2e)); dr.position.set(0, 0.21, 0.57); hut.add(dr);
      const wm = new THREE.MeshBasicMaterial({ color:0xa8dcff }); W.wins.push(wm);
      const wn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.05), wm); wn.position.set(0.4, 0.44, 0.4); wn.rotation.y = Math.PI/4; hut.add(wn);
      P(hut, freeDir(0.45));
    }
    bush(0x8aa04a, 6);
    rocks(0xbfa27f, 6);
    const sc = [0xff9a3c, 0xffd23f, 0xff6f61];
    for (let i=0;i<10;i++) P(flower(sc[i % sc.length], i), freeDir(0.15));
  } else {
    // árvore-casa da corujinha
    {
      const ht = new THREE.Group();
      const bark = mat(0x8a6446, 0.9), leaf = mat(0x4f9e72, 0.85);
      const tr = S3(new THREE.CylinderGeometry(0.55, 0.75, 2.4, 18), bark); tr.position.y = 1.2; ht.add(tr);
      [[-1,0.1],[1,-0.2],[0.2,1]].forEach(([sx,sz]) => {
        const rt = S3(new THREE.CylinderGeometry(0.08, 0.26, 0.9, 8), bark);
        rt.position.set(sx*0.62, 0.18, sz*0.55); rt.rotation.set(sz*0.9, 0, sx*1.1); ht.add(rt);
      });
      [[0,3.0,0,1.25],[0.95,2.6,0.2,0.85],[-0.9,2.7,-0.1,0.9],[0.2,3.75,0,0.8]].forEach(([x,y,z,r]) => {
        const c = S3(new THREE.SphereGeometry(r, 20, 14), leaf); c.position.set(x,y,z); ht.add(c);
      });
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), mat(0x3a2616, 1)); hole.position.set(0, 1.6, 0.63); ht.add(hole);
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24, 0, Math.PI), glow(0xffc86b)); door.position.set(0, 0.28, 0.74); ht.add(door);
      const doorBase = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), glow(0xffc86b)); doorBase.position.set(0, 0.14, 0.74); ht.add(doorBase);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5), mat(0x444444)); str.position.set(0.95, 2.05, 0.55); ht.add(str);
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), glow(0xffe08a)); lan.position.set(0.95, 1.75, 0.55); ht.add(lan);
      P(ht, freeDir(0.75, new THREE.Vector3(-0.68, 0.72, 0.08)));
    }
    // pinheiros
    for (let i=0;i<10;i++){
      const pn = new THREE.Group();
      const tr = S3(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8), mat(0x7a5436)); tr.position.y = 0.3; pn.add(tr);
      const lm = mat(i % 2 ? 0x2f8a5f : 0x3a9a6a, 0.85);
      [[0.8,1.0,0.95],[0.62,0.85,1.5],[0.42,0.7,2.0]].forEach(([r,h,y]) => { const c = S3(new THREE.ConeGeometry(r, h, 12), lm); c.position.y = y; pn.add(c); });
      pn.scale.setScalar(0.8 + Math.random()*0.45); P(pn, freeDir(0.4));
    }
    // árvores mágicas coloridas
    [0x8fd6cf, 0xbfa6ec, 0x8fd6cf, 0xf2a7cf].forEach(col => {
      const t = new THREE.Group();
      const trunk = S3(new THREE.CylinderGeometry(0.11, 0.16, 1, 10), mat(0x9a7a63)); trunk.position.y = 0.5; t.add(trunk);
      const lf = mat(col, 0.8);
      [[0,1.35,0,0.62],[0.36,1.1,0.1,0.42],[-0.32,1.15,-0.1,0.45]].forEach(([x,y,z,r]) => { const m = S3(new THREE.SphereGeometry(r, 16, 12), lf); m.position.set(x,y,z); t.add(m); });
      for (let k=0;k<4;k++){ const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xfff2a0)); const a = Math.random()*6.28; b.position.set(Math.cos(a)*0.55, 1.1 + Math.random()*0.5, Math.sin(a)*0.55); t.add(b); }
      P(t, freeDir(0.4));
    });
    // cogumelos que brilham
    const mc = [0x6fe8ff, 0xc59bff, 0xff8fd0];
    for (let i=0;i<14;i++){
      const m = new THREE.Group();
      const st = S3(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 10), mat(0xfff3dc)); st.position.y = 0.13; m.add(st);
      const cp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI*2, 0, Math.PI/2), glow(mc[i % 3])); cp.position.y = 0.24; m.add(cp);
      [[0.09,0.37,0.07],[-0.08,0.35,-0.09]].forEach(([x,y,z]) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), dotMat); d.position.set(x,y,z); m.add(d); });
      m.scale.setScalar(0.8 + Math.random()*0.7); P(m, freeDir(0.13));
    }
    // cristais
    for (let i=0;i<7;i++){
      const cr = new THREE.Group(); const cm = glow(i % 2 ? 0x9fe8ff : 0xd4b0ff);
      [[0,0,0,0.22,0],[0.18,0,0.05,0.14,0.4],[-0.15,0,0.08,0.12,-0.35]].forEach(([x,y,z,r,t]) => {
        const o = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), cm); o.scale.y = 2; o.position.set(x, r*1.6, z); o.rotation.z = t; cr.add(o);
      });
      P(cr, freeDir(0.2));
    }
    bush(0x4f9e72, 4);
    rocks(0x8a96a8, 5);
    const fc = [0xffe27a, 0x9fe8ff, 0xffa8e0, 0xc9b3ff];
    for (let i=0;i<16;i++) P(flower(fc[i % fc.length], i, true), freeDir(0.14));
  }

  // vaga-lumes
  for (let i=0;i<(kind === 'forest' ? 44 : 26);i++){
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), flyMat.clone());
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flyMat.clone()); f.add(glow);
    f.userData = { glow, d:randDir(), h:0.5 + Math.random()*1.6, p:Math.random()*10, sp:0.4 + Math.random()*0.5 };
    g.add(f); W.flies.push(f);
  }
  return W;
}
