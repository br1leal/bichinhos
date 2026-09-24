import * as THREE from 'three';
import { sculptMesh, ellipsoid, sphere, roundCone, smin, sub, inter, rgb, layer } from '../sculpt.js';
import { makeEye } from '../eyes.js';
import { biped } from './biped.js';

// ================= patinho =================
// Referência: cabeção redondo, topete de 3 pétalas, olhos grandes, bico largo
// com sorrisinho e narinas, bochechas rosadas, corpo de pera com barriga clara,
// asinhas em remo, rabinho em leque e pés com 3 dedinhos.

const C = {
  body: rgb(0xf0ad2c), tuft: rgb(0xf8da78), belly: rgb(0xf6e29a),
  bill: rgb(0xf08a3d), billLo: rgb(0xe57837), nose: rgb(0xc9602b),
  cheek: rgb(0xf4a5b5), foot: rgb(0xee8538)
};

// ---------- cabeça ----------
const tuftSdf = (x, y, z) => {
  let d = roundCone(x, y, z, [0, 0.6, -0.04], [0, 0.93, -0.02], 0.05, 0.105);
  d = smin(d, roundCone(x, y, z, [-0.04, 0.6, -0.05], [-0.19, 0.83, -0.03], 0.045, 0.09), 0.03);
  d = smin(d, roundCone(x, y, z, [0.04, 0.6, -0.05], [0.19, 0.83, -0.03], 0.045, 0.09), 0.03);
  return d;
};
// bico de cima: largo e achatado, cantinhos subindo num sorriso
const billSdf = (x, y, z) => ellipsoid(x, y + 0.28 * x * x, z, 0, -0.23, 0.68, 0.44, 0.14, 0.34);
const nostril = (x, y, z) => Math.min(sphere(x, y, z, 0.08, -0.1, 0.96, 0.028), sphere(x, y, z, -0.08, -0.1, 0.96, 0.028));

function headSdf(x, y, z){
  let d = ellipsoid(x, y, z, 0, 0, 0, 0.75, 0.7, 0.67);
  d = smin(d, tuftSdf(x, y, z), 0.07);
  d = smin(d, billSdf(x, y, z), 0.07);
  d = sub(d, nostril(x, y, z) + 0.012, 0.03);
  return d;
}
function headPaint(x, y, z){
  let c = C.body;
  c = layer(c, tuftSdf(x, y, z) - 0.01, C.tuft, 0.03);
  c = layer(c, billSdf(x, y, z) - 0.004, C.bill, 0.01);
  c = layer(c, nostril(x, y, z) - 0.012, C.nose, 0.006);
  c = layer(c, Math.min(sphere(x, y, z, 0.575, -0.27, 0.41, 0.1), sphere(x, y, z, -0.575, -0.27, 0.41, 0.1)), C.cheek, 0.006);
  return c;
}
// bico de baixo (separado, para abrir quando fala)
const jawSdf = (x, y, z) => ellipsoid(x, y + 0.3 * x * x, z, 0, -0.01, 0.22, 0.37, 0.1, 0.27);

// ---------- corpo ----------
function bodySdf(x, y, z){
  let d = smin(ellipsoid(x, y, z, 0, 0.52, 0, 0.45, 0.43, 0.41), ellipsoid(x, y, z, 0, 0.82, 0, 0.33, 0.3, 0.31), 0.18);
  // rabinho em leque
  let t = roundCone(x, y, z, [0, 0.5, -0.33], [0, 0.63, -0.5], 0.06, 0.055);
  t = smin(t, roundCone(x, y, z, [-0.03, 0.49, -0.33], [-0.1, 0.58, -0.47], 0.05, 0.045), 0.02);
  t = smin(t, roundCone(x, y, z, [0.03, 0.49, -0.33], [0.1, 0.58, -0.47], 0.05, 0.045), 0.02);
  return smin(d, t, 0.05);
}
const bodyPaint = (x, y, z) => layer(C.body, ellipsoid(x, y, z, 0, 0.5, 0.3, 0.32, 0.31, 0.18), C.belly, 0.012);

// ---------- asinha (remo) ----------
const wingSdf = s => (x, y, z) => {
  const f = 1.35; // achata de lado
  return roundCone(x * f, y, z, [0, 0, 0], [s * 0.1 * f, -0.3, 0.03], 0.1, 0.16) / f;
};

// ---------- pé ----------
function footSdf(x, y, z){
  const leg = roundCone(x, y, z, [0, 0.1, 0], [0, 0.34, 0], 0.075, 0.09);
  let foot = ellipsoid(x, y, z, 0, 0.055, 0.1, 0.19, 0.065, 0.22);
  for (const dx of [-0.11, 0, 0.11]) foot = smin(foot, sphere(x, y, z, dx, 0.045, 0.28, 0.075), 0.05);
  return inter(smin(leg, foot, 0.06), -y, 0.015); // sola reta
}

export function makeDuck(fx){
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  body.add(sculptMesh({ bounds: [[-0.55, 0.03, -0.62], [0.55, 1.2, 0.52]], step: 0.022, sdf: bodySdf, paint: bodyPaint }));

  const arms = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(s * 0.42, 0.9, 0.03); p.userData.side = s;
    p.add(sculptMesh({ bounds: [[-0.2 + s * 0.06, -0.66, -0.2], [0.2 + s * 0.06, 0.14, 0.22]], step: 0.014, sdf: wingSdf(s), paint: () => C.body }));
    body.add(p); arms.push(p);
  });

  const head = new THREE.Group(); head.position.set(0, 1.62, 0.02); head.scale.setScalar(1.07); body.add(head);
  head.add(sculptMesh({ bounds: [[-0.9, -0.8, -0.75], [0.9, 1.05, 1.14]], step: 0.02, sdf: headSdf, paint: headPaint }));
  const jaw = new THREE.Group(); jaw.position.set(0, -0.33, 0.46); head.add(jaw);
  jaw.add(sculptMesh({ bounds: [[-0.44, -0.14, -0.08], [0.44, 0.12, 0.54]], step: 0.012, sdf: jawSdf, paint: () => C.billLo }));

  const eyes = [];
  [-1, 1].forEach(s => {
    const e = makeEye({ r: 0.235, depth: 0.72, pupil: [0.6, 0.6], pupilOffset: [-0.08, -0.04], side: s });
    e.position.set(s * 0.36, 0.0, 0.5); e.rotation.y = s * 0.3;
    head.add(e); eyes.push(e);
  });

  const legs = [];
  [-1, 1].forEach(s => {
    const f = new THREE.Group(); f.position.set(s * 0.27, 0, 0.02);
    f.add(sculptMesh({ bounds: [[-0.28, -0.01, -0.18], [0.28, 0.42, 0.4]], step: 0.014, sdf: footSdf, paint: () => C.foot }));
    root.add(f); legs.push(f);
  });

  const walk = biped({ body, head, arms, legs }, { sway: 0.14, bounce: 0.09, stride: 0.2 });
  let talkT = 0;
  return {
    name: 'duck', root, head, eyes, bubbleUp: 1.25, sink: 0.5, jump: 5.2, walkRate: 1,
    words: ['Quá quá!', 'Quá!'],
    speak(){ talkT = 0.45; fx.quack(); },
    anim(s, dt){
      walk(s, dt, this.sink);
      if (talkT > 0){ talkT -= dt; jaw.rotation.x = Math.abs(Math.sin(talkT * 28)) * 0.4; }
      else jaw.rotation.x *= 0.8;
    }
  };
}
