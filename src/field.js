import * as THREE from 'three';
import { mat, shadowy } from './materials.js';

// =====================================================================
// Campo aberto da fazenda
// ---------------------------------------------------------------------
// O bichinho fica sempre no centro e o campo desliza embaixo dele.
// Os enfeites vivem num "ladrilho" de L x L que se repete: quando algo
// fica para trás, reaparece lá na frente. Assim o campo parece infinito
// sem precisar de milhares de objetos. A névoa esconde a borda do mundo.
// =====================================================================

export const L = 46;
const HALF = L / 2;
const wrap = v => ((v + HALF) % L + L) % L - HALF;

export const winDay = new THREE.Color(0xa8dcff), winNight = new THREE.Color(0xffd36b);
const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const flyMat = new THREE.MeshBasicMaterial({ color: 0xfff4a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

export function makeField(scene){
  const g = new THREE.Group(); scene.add(g);
  const W = { kind: 'farm', flat: true, group: g, flowers: [], flies: [], wins: [], critters: [], glows: [], items: [], pop: 1 };
  const S3 = (geo, m) => shadowy(new THREE.Mesh(geo, m));

  // item que se repete no ladrilho; x,z são coordenadas do campo
  W.add = (obj, x, z, spin = Math.random() * 6.283) => {
    const h = new THREE.Group(); h.rotation.y = spin; h.add(obj); g.add(h);
    const it = { h, x, z }; W.items.push(it); return it;
  };
  W.remove = it => { const i = W.items.indexOf(it); if (i >= 0) W.items.splice(i, 1); if (it.h.parent) it.h.parent.remove(it.h); };
  W.update = off => { for (const it of W.items){ it.h.position.x = wrap(it.x - off.x); it.h.position.z = wrap(it.z - off.z); } };

  // chão grande (fica sempre centrado; a névoa esconde a borda)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 64), mat(0x8fd46a, 0.95));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  // manchinhas de grama mais clara/escura, para o chão não ficar liso
  for (let i = 0; i < 60; i++){
    const r = 1 + Math.random() * 2.2;
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat(i % 2 ? 0x7cc65c : 0xa3dc7a, 1));
    p.rotation.x = -Math.PI / 2; p.position.y = 0.004 + (i % 3) * 0.001; p.scale.set(1, 0.65 + Math.random() * 0.5, 1); p.receiveShadow = true;
    W.add(p, (Math.random() - 0.5) * L, (Math.random() - 0.5) * L);
  }

  // ---------- onde cada coisa pode ficar ----------
  const used = [];
  const POND = { x: -7.5, z: -4.5, r: 3.6 };
  const reserved = [[0, 0, 3.8], [POND.x, POND.z, POND.r + 1.4], [5.5, -8, 2.2], [-8.5, -15, 2.2]]; // início, lago e amigos
  function spot(rad, fixed){
    if (fixed){ used.push([fixed[0], fixed[1], rad]); return fixed; }
    for (let k = 0; k < 600; k++){
      const x = (Math.random() - 0.5) * L, z = (Math.random() - 0.5) * L;
      if (reserved.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + rad)) continue;
      if (used.some(([a, b, r]) => Math.hypot(x - a, z - b) < r + rad)) continue;
      used.push([x, z, rad]); return [x, z];
    }
    return [(Math.random() - 0.5) * L, (Math.random() - 0.5) * L];
  }
  const put = (obj, rad, fixed, spin) => { const [x, z] = spot(rad, fixed); return W.add(obj, x, z, spin); };

  // ---------- lago ----------
  {
    const pg = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 0.35, 48), mat(0xd9c9a3, 1));
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.012; rim.receiveShadow = true; pg.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), mat(0x5cc0ee, 0.25));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.02; water.receiveShadow = true; pg.add(water);
    [[1.2, 0.4, 0.48], [2.1, 2.2, 0.38], [0.7, 3.6, 0.3], [2.4, 4.6, 0.36], [1.5, 5.6, 0.3]].forEach(([d, a, r]) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0.4, Math.PI * 2 - 0.8), mat(0x3f9e45, 0.9));
      pad.rotation.x = -Math.PI / 2; pad.rotation.z = Math.random() * 6; pad.position.set(Math.cos(a) * d, 0.03, Math.sin(a) * d); pg.add(pad);
    });
    W.pond = W.add(pg, POND.x, POND.z, 0); W.pond.r = POND.r;
  }
  W.inPond = (x, z, pad = 0) => Math.hypot(x - W.pond.h.position.x, z - W.pond.h.position.z) < W.pond.r - pad;

  // ---------- enfeites ----------
  function flower(color, i){
    const f = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), mat(0x4c9a3c)); stem.position.y = 0.3; f.add(stem);
    const center = S3(new THREE.SphereGeometry(0.1, 12, 10), mat(0xffc93c)); center.position.y = 0.62; f.add(center);
    const pm = mat(color);
    for (let k = 0; k < 5; k++){
      const a = k / 5 * Math.PI * 2;
      const p = S3(new THREE.SphereGeometry(0.12, 10, 8), pm); p.scale.set(1, 0.45, 1); p.position.set(Math.cos(a) * 0.17, 0.62, Math.sin(a) * 0.17); f.add(p);
    }
    f.userData.phase = i; W.flowers.push(f); return f;
  }
  const wood = mat(0xc89b6a, 0.85);

  // celeiro vermelho
  {
    const b = new THREE.Group();
    const red = mat(0xd9453b, 0.75), trim = mat(0xfff6ea, 0.7);
    const walls = S3(new THREE.BoxGeometry(1.7, 1.1, 1.3), red); walls.position.y = 0.55; b.add(walls);
    const rg = new THREE.CylinderGeometry(0.85, 0.85, 1.85, 3); rg.rotateY(Math.PI / 2); rg.rotateZ(Math.PI / 2);
    const roof = S3(rg, mat(0x8a4b3a, 0.8)); roof.position.y = 1.525; b.add(roof);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.72), trim); frame.position.set(0.86, 0.4, 0); b.add(frame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.6), mat(0xa8322b, 0.8)); door.position.set(0.875, 0.37, 0); b.add(door);
    [0.72, -0.72].forEach(a => { const x = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.06), trim); x.position.set(0.9, 0.37, 0); x.rotation.x = a; b.add(x); });
    const wm = new THREE.MeshBasicMaterial({ color: 0xa8dcff }); W.wins.push(wm);
    const loft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.3), wm); loft.position.set(0.93, 1.42, 0); b.add(loft);
    b.scale.setScalar(1.6);
    put(b, 2.6, [10, -13], -2.3);
    // silo ao lado
    const si = new THREE.Group();
    const c = S3(new THREE.CylinderGeometry(0.42, 0.42, 1.9, 20), mat(0xd6d9dc, 0.6)); c.position.y = 0.95; si.add(c);
    [0.5, 1.35].forEach(y => { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.07, 20), mat(0xd9453b)); band.position.y = y; si.add(band); });
    const dome = S3(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa3ab, 0.5)); dome.position.y = 1.9; si.add(dome);
    si.scale.setScalar(1.6);
    put(si, 1, [13.2, -11]);
  }
  // casinha da fazenda
  {
    const hs = new THREE.Group();
    const walls = S3(new THREE.BoxGeometry(1.1, 0.85, 0.95), mat(0xfff1dc, 0.8)); walls.position.y = 0.42; hs.add(walls);
    const roof = S3(new THREE.ConeGeometry(0.95, 0.7, 4), mat(0x5b8fd9, 0.7)); roof.rotation.y = Math.PI / 4; roof.position.y = 1.18; hs.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.04), mat(0x9a6a43)); door.position.set(0, 0.21, 0.48); hs.add(door);
    const wm = new THREE.MeshBasicMaterial({ color: 0xa8dcff }); W.wins.push(wm);
    [-0.34, 0.34].forEach(x => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.04), wm); w.position.set(x, 0.52, 0.48); hs.add(w); });
    const chim = S3(new THREE.BoxGeometry(0.16, 0.36, 0.16), mat(0xc9a27e)); chim.position.set(0.3, 1.3, -0.15); hs.add(chim);
    hs.scale.setScalar(1.8);
    put(hs, 2.2, [-14, -9], 0.6);
  }
  // fardos de feno
  for (let i = 0; i < 9; i++){
    const hb = new THREE.Group();
    const c = S3(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 18), mat(0xe8c65a, 0.95)); c.rotation.z = Math.PI / 2; c.position.y = 0.3; hb.add(c);
    [-0.26, 0.26].forEach(x => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat(0xd4ad45)); e.rotation.y = Math.PI / 2 * Math.sign(x); e.position.set(x, 0.3, 0); hb.add(e); });
    hb.scale.setScalar(1.3); put(hb, 0.6);
  }
  // cerquinhas (em trechos de 3)
  for (let i = 0; i < 7; i++){
    const fe = new THREE.Group();
    for (let k = 0; k < 3; k++){
      [-0.5, 0, 0.5].forEach(x => { const pst = S3(new THREE.BoxGeometry(0.08, 0.5, 0.08), wood); pst.position.set(x + k * 1.05, 0.25, 0); fe.add(pst); });
      [0.18, 0.36].forEach(y => { const rl = S3(new THREE.BoxGeometry(1.1, 0.07, 0.05), wood); rl.position.set(k * 1.05, y, 0); fe.add(rl); });
    }
    fe.scale.setScalar(1.2); put(fe, 2);
  }
  // abóboras
  for (let i = 0; i < 12; i++){
    const pk = new THREE.Group();
    const b = S3(new THREE.SphereGeometry(0.22, 16, 12), mat(0xff8a1f, 0.6)); b.scale.set(1, 0.75, 1); b.position.y = 0.16; pk.add(b);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 6), mat(0x4c7a2c)); st.position.y = 0.36; pk.add(st);
    pk.scale.setScalar(1.2); put(pk, 0.4);
  }
  // ovelhinhas pastando
  for (let i = 0; i < 6; i++){
    const sh = new THREE.Group();
    const wool = mat(0xfafafa, 0.95), face = mat(0x3a3330, 0.7);
    [[0, 0.55, 0, 0.36], [0.2, 0.62, 0.15, 0.24], [-0.2, 0.62, 0.15, 0.24], [0.2, 0.62, -0.18, 0.24], [-0.2, 0.62, -0.18, 0.24], [0, 0.8, 0, 0.26]].forEach(([x, y, z, r]) => {
      const m = S3(new THREE.SphereGeometry(r, 14, 10), wool); m.position.set(x, y, z); sh.add(m);
    });
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => { const l = S3(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 6), face); l.position.set(a * 0.16, 0.18, b * 0.18); sh.add(l); });
    const hd = new THREE.Group(); hd.position.set(0, 0.62, 0.4); sh.add(hd);
    const hm = S3(new THREE.SphereGeometry(0.17, 14, 10), face); hm.scale.set(0.9, 1, 1.15); hm.position.z = 0.08; hd.add(hm);
    [-1, 1].forEach(sd => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), face); ear.scale.set(1.6, 0.5, 0.8); ear.position.set(sd * 0.17, 0.05, 0.02); hd.add(ear);
      const ey = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dotMat); ey.position.set(sd * 0.07, 0.06, 0.24); hd.add(ey);
    });
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), wool); tuft.position.set(0, 0.15, 0.02); hd.add(tuft);
    const ph = Math.random() * 6;
    W.critters.push(t => { hd.rotation.x = 0.35 + Math.sin(t * 1.2 + ph) * 0.35; });
    sh.scale.setScalar(1.4); put(sh, 1);
  }
  // macieiras
  for (let i = 0; i < 14; i++){
    const t = new THREE.Group();
    const trunk = S3(new THREE.CylinderGeometry(0.12, 0.17, 1, 10), mat(0x9a6a43, 0.9)); trunk.position.y = 0.5; t.add(trunk);
    const leaf = mat(i % 3 ? 0x4fa845 : 0x6cbf4c, 0.85);
    [[0, 1.35, 0, 0.65], [0.35, 1.1, 0.1, 0.45], [-0.32, 1.15, -0.1, 0.48], [0, 1.75, 0, 0.42]].forEach(([x, y, z, r]) => {
      const m = S3(new THREE.SphereGeometry(r, 16, 12), leaf); m.position.set(x, y, z); t.add(m);
    });
    if (i % 2 === 0) [[0.4, 1.25, 0.35], [-0.2, 1.55, 0.45], [0.1, 1.0, 0.55]].forEach(([x, y, z]) => {
      const ap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xff5a5a, 0.5)); ap.position.set(x, y, z); t.add(ap);
    });
    t.scale.setScalar(1.7 + Math.random() * 0.7); put(t, 1.6);
  }
  // arbustos
  for (let i = 0; i < 12; i++){
    const b = new THREE.Group();
    [[0, 0.55, 0, 0.7], [0.55, 0.4, 0.2, 0.5], [-0.45, 0.4, 0.25, 0.5]].forEach(([bx, by, bz, br]) => {
      const m = S3(new THREE.SphereGeometry(br, 18, 14), mat(0x5cb04a, 0.9)); m.position.set(bx, by, bz); b.add(m);
    });
    b.scale.setScalar(0.7 + Math.random() * 0.5); put(b, 1);
  }
  // pedrinhas
  for (let i = 0; i < 10; i++){
    const sz = 0.22 + Math.random() * 0.2;
    const r = S3(new THREE.DodecahedronGeometry(sz, 0), mat(0xb7b3ad, 1));
    r.position.y = sz * 0.5; r.rotation.set(Math.random(), Math.random(), 0); put(r, 0.4);
  }
  // flores
  const pc = [0xff8fb8, 0xffffff, 0xb79cff, 0xff9a5a, 0xffe066];
  for (let i = 0; i < 70; i++){ const f = flower(pc[i % pc.length], i); f.scale.setScalar(1.2); put(f, 0.25); }

  // vaga-lumes (acendem à noite)
  for (let i = 0; i < 40; i++){
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), flyMat.clone());
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flyMat.clone()); f.add(halo);
    f.userData = { halo, h: 0.5 + Math.random() * 1.8, p: Math.random() * 10, sp: 0.4 + Math.random() * 0.5 };
    W.add(f, (Math.random() - 0.5) * L, (Math.random() - 0.5) * L, 0);
    W.flies.push(f);
  }

  // animações do cenário a cada quadro
  W.tick = (t, night) => {
    W.wins.forEach(m => m.color.copy(winDay).lerp(winNight, night));
    W.flowers.forEach(f => f.rotation.z = Math.sin(t * 1.5 + f.userData.phase) * 0.06);
    W.critters.forEach(c => c(t));
    W.flies.forEach(f => {
      const u = f.userData;
      f.position.set(Math.sin(t * u.sp + u.p) * 0.6, u.h + Math.sin(t * u.sp * 1.7 + u.p) * 0.35, Math.cos(t * u.sp * 0.8 + u.p) * 0.6);
      f.material.opacity = night * (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + u.p * 3)));
      u.halo.material.opacity = f.material.opacity * 0.3;
      f.visible = night > 0.02;
    });
  };
  return W;
}
