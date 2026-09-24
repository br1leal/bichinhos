import * as THREE from 'three';
import { sculptMesh, ellipsoid, sphere, roundCone, smin, inter, rgb, layer } from '../sculpt.js';
import { makeEye } from '../eyes.js';

// ================= corujinha =================
// Referência: cabeção caramelo com dois tufinhos de orelha em cada canto,
// máscara creme em formato de coração (bico de "V" no alto), olhos enormes,
// biquinho laranja, bochechas rosadas, barriga creme com peninhas em "u",
// asinhas em remo, rabinho em leque mais escuro e pés laranja de 3 dedinhos.
// Ela é a amiga da noite: voa, pousa e, quando tocada, só faz "uhuu uhuu".

const C = {
  body: rgb(0xc98a4e), dark: rgb(0xb3743d), cream: rgb(0xeedcb8), scallop: rgb(0xe2cda6),
  beak: rgb(0xf2894a), cheek: rgb(0xf1a7b8), foot: rgb(0xee8a3e)
};

// ---------- cabeça ----------
const tuftSdf = (x, y, z) => {
  const s = x < 0 ? -1 : 1, ax = Math.abs(x);
  let d = roundCone(ax, y, z, [0.52, 0.42, -0.02], [0.68, 0.6, -0.02], 0.09, 0.12);
  d = smin(d, roundCone(ax, y, z, [0.62, 0.34, -0.02], [0.86, 0.47, -0.02], 0.075, 0.095), 0.03);
  return d;
};
const beakSdf = (x, y, z) => roundCone(x, y, z, [0, -0.17, 0.66], [0, -0.33, 0.73], 0.075, 0.03);
// máscara em coração, vista de frente
function heart(x, y){
  const lobes = Math.min(Math.hypot(x - 0.27, y - 0.08) - 0.38, Math.hypot(x + 0.27, y - 0.08) - 0.38);
  const low = ellipsoid(x, y, 0, 0, -0.13, 0, 0.6, 0.45, 1);
  return Math.min(lobes, low);
}
function headSdf(x, y, z){
  let d = ellipsoid(x, y, z, 0, 0, 0, 0.85, 0.7, 0.72);
  d = smin(d, tuftSdf(x, y, z), 0.06);
  d = smin(d, beakSdf(x, y, z), 0.03);
  return d;
}
function headPaint(x, y, z){
  let c = C.body;
  if (z > 0.25) c = layer(c, heart(x, y), C.cream, 0.015);
  c = layer(c, tuftSdf(x, y, z) - 0.02, C.dark, 0.03);
  c = layer(c, beakSdf(x, y, z) - 0.006, C.beak, 0.008);
  c = layer(c, Math.min(sphere(x, y, z, 0.5, -0.38, 0.52, 0.1), sphere(x, y, z, -0.5, -0.38, 0.52, 0.1)), C.cheek, 0.006);
  return c;
}

// ---------- corpo ----------
const SCALLOPS = [];
[[0.68, [-0.2, 0, 0.2]], [0.55, [-0.27, -0.09, 0.09, 0.27]], [0.42, [-0.2, 0, 0.2]]].forEach(([y, xs]) => xs.forEach(x => SCALLOPS.push([x, y])));
function bodySdf(x, y, z){
  let d = smin(ellipsoid(x, y, z, 0, 0.55, 0, 0.47, 0.44, 0.43), ellipsoid(x, y, z, 0, 0.84, 0, 0.36, 0.3, 0.34), 0.18);
  let t = roundCone(x, y, z, [0, 0.5, -0.36], [0, 0.66, -0.56], 0.07, 0.075);
  t = smin(t, roundCone(x, y, z, [-0.04, 0.48, -0.36], [-0.15, 0.6, -0.53], 0.06, 0.06), 0.02);
  t = smin(t, roundCone(x, y, z, [0.04, 0.48, -0.36], [0.15, 0.6, -0.53], 0.06, 0.06), 0.02);
  return smin(d, t, 0.05);
}
function bodyPaint(x, y, z){
  const belly = ellipsoid(x, y, z, 0, 0.56, 0.3, 0.38, 0.36, 0.2);
  let c = layer(C.body, belly, C.cream, 0.012);
  if (belly < 0 && z > 0.2) for (const [sx, sy] of SCALLOPS){
    if (y > sy) continue; // só a metade de baixo: vira um "u"
    c = layer(c, Math.abs(Math.hypot(x - sx, y - sy) - 0.045) - 0.008, C.scallop, 0.005);
  }
  if (z < -0.3 && y < 0.72) c = layer(c, -0.01, C.dark, 0.001); // rabinho escuro
  return c;
}

// ---------- asa (remo com pontinha) ----------
const wingSdf = s => (x, y, z) => {
  const f = 1.45;
  return roundCone(x * f, y, z, [0, 0, 0], [s * 0.1 * f, -0.34, 0.02], 0.11, 0.16) / f;
};

// ---------- pé ----------
function footSdf(x, y, z){
  const leg = roundCone(x, y, z, [0, 0.1, 0], [0, 0.3, 0], 0.075, 0.085);
  let foot = ellipsoid(x, y, z, 0, 0.055, 0.1, 0.18, 0.065, 0.2);
  for (const dx of [-0.1, 0, 0.1]) foot = smin(foot, sphere(x, y, z, dx, 0.045, 0.26, 0.07), 0.05);
  return inter(smin(leg, foot, 0.06), -y, 0.015);
}

export function makeOwl(fx){
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  body.add(sculptMesh({ bounds: [[-0.56, 0.06, -0.66], [0.56, 1.2, 0.52]], step: 0.022, sdf: bodySdf, paint: bodyPaint }));

  const wings = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(s * 0.45, 0.92, 0.02); p.userData.side = s;
    p.add(sculptMesh({ bounds: [[-0.22 + s * 0.06, -0.68, -0.2], [0.22 + s * 0.06, 0.15, 0.2]], step: 0.014, sdf: wingSdf(s), paint: () => C.dark }));
    body.add(p); wings.push(p);
  });

  const head = new THREE.Group(); head.position.set(0, 1.72, 0.02); body.add(head);
  head.add(sculptMesh({ bounds: [[-1.02, -0.74, -0.76], [1.02, 0.95, 0.82]], step: 0.02, sdf: headSdf, paint: headPaint }));

  const eyes = [];
  [-1, 1].forEach(s => {
    const e = makeEye({ r: 0.27, depth: 0.68, pupil: [0.6, 0.6], pupilOffset: [-0.03, -0.03], side: s });
    e.position.set(s * 0.37, -0.02, 0.52); e.rotation.y = s * 0.3;
    head.add(e); eyes.push(e);
  });

  const feet = new THREE.Group(); body.add(feet);
  [-1, 1].forEach(s => {
    const f = new THREE.Group(); f.position.set(s * 0.25, 0, 0.03);
    f.add(sculptMesh({ bounds: [[-0.26, -0.01, -0.18], [0.26, 0.36, 0.36]], step: 0.014, sdf: footSdf, paint: () => C.foot }));
    feet.add(f);
  });

  let alt = 1.6, spread = 1, flapPh = 0, prevYaw = 0, headIn = 6, turnT = 0;
  return {
    name: 'owl', root, head, eyes, bubbleUp: 1.25, sink: 0, jump: 0, flies: true, sleepDrop: 0,
    words: ['Uhuu... uhuu!'], nightWords: ['Uhuu... uhuu!'],
    speak(){ fx.hoot(); }, // tocar na corujinha: só o "uhuu uhuu"
    anim(s, dt){
      const wantAir = s.sleep < 0.2 && (s.idle < 3 || s.swim > 0.3);
      alt += ((wantAir ? 1.6 : 0) - alt) * Math.min(1, dt * 2.2);
      spread += ((alt > 0.15 ? 1 : 0) - spread) * Math.min(1, dt * 6);
      flapPh += dt * (9 + s.moveAmt * 6) * spread;
      body.position.y = alt + Math.sin(flapPh) * 0.08 * spread + Math.sin(s.t * 2.2) * 0.01 * (1 - spread);
      // asa parada = pendurada do lado; voando = abre na horizontal e bate
      wings.forEach(w => { const sd = w.userData.side; w.rotation.z = sd * spread * (1.25 + Math.sin(flapPh) * 0.45); });
      let yr = s.yaw - prevYaw; yr = Math.atan2(Math.sin(yr), Math.cos(yr)); prevYaw = s.yaw;
      const bank = Math.max(-0.4, Math.min(0.4, -yr / Math.max(dt, 0.001) * 0.1));
      body.rotation.z += (bank * spread - body.rotation.z) * Math.min(1, dt * 5);
      body.rotation.x = 0.3 * s.moveAmt * spread;
      feet.rotation.x = spread * 0.8;
      // de vez em quando, parada, gira a cabeça bem pra trás (coisa de coruja)
      if (spread < 0.2 && turnT <= 0){ headIn -= dt; if (headIn <= 0){ turnT = 2.4; headIn = 7 + Math.random() * 4; } }
      if (turnT > 0){
        turnT -= dt;
        const q = 2.4 - turnT;
        const k = q < 0.5 ? q / 0.5 : q < 1.9 ? 1 : Math.max(0, (2.4 - q) / 0.5);
        head.rotation.y = Math.PI * 0.95 * (k * k * (3 - 2 * k));
      } else head.rotation.y = Math.sin(s.t * 0.8) * 0.3 * (1 - s.moveAmt);
      head.rotation.z = Math.sin(s.t * 0.9) * 0.1 * (1 - s.moveAmt);
      head.rotation.x = 0;
    }
  };
}
