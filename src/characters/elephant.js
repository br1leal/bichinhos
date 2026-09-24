import * as THREE from 'three';
import { sculptMesh, ellipsoid, sphere, roundCone, tube, smin, sub, inter, rotZ, rgb, layer } from '../sculpt.js';
import { makeEye } from '../eyes.js';
import { biped } from './biped.js';

// ================= elefantinha =================
// Referência: cabeça enorme e redonda, orelhas grandes com miolo rosa,
// laço rosa no alto da cabeça, olhos grandes com cílios, bochechas rosadas,
// tromba curtinha que enrola para o lado, corpo de pera com barriga clara,
// bracinhos e pés com unhas creme, rabinho com pompom em gota.

const C = {
  body: rgb(0x8fa3c8), belly: rgb(0xd3e1ec), ear: rgb(0xf1c2cd), cheek: rgb(0xee8a99),
  bow: rgb(0xf591b6), nail: rgb(0xefe1cb), lash: rgb(0x3a3a48), tip: rgb(0x7788ad)
};

// ---------- cabeça ----------
const TRUNK = [[0, -0.1, 0.44], [0, -0.32, 0.6], [0.02, -0.52, 0.66], [0.12, -0.62, 0.67], [0.22, -0.56, 0.65]];
const trunkSdf = (x, y, z) => tube(x, y, z, TRUNK, [0.14, 0.115, 0.095, 0.085, 0.08], 0.05);
const tipHole = (x, y, z) => sphere(x, y, z, 0.25, -0.53, 0.65, 0.045);

// laço: dois laços e um nó, inclinado no alto da cabeça (lado direito)
function bowSdf(x, y, z){
  let [lx, ly] = rotZ((x - 0.3) / 1.18, (y - 0.6) / 1.18, 0.35); const lz = (z - 0.1) / 1.18;
  const lobe = sx => {
    const [ax, ay] = rotZ(lx - sx * 0.16, ly - 0.02, sx * 0.35);
    return ellipsoid(ax, ay, lz, 0, 0, 0, 0.16, 0.12, 0.085);
  };
  return smin(smin(lobe(-1), lobe(1), 0.03), sphere(lx, ly, lz, 0, 0, 0.02, 0.07), 0.03) * 1.18;
}

// cílios: 3 risquinhos no cantinho de fora de cada olho
const EYE = [0.35, 0.03, 0.44], ER = 0.2;
function lashSdf(x, y, z){
  let d = 1e9;
  for (const s of [-1, 1]) for (const a of [0.55, 0.8, 1.05]){
    const bx = s * (EYE[0] + (ER + 0.01) * Math.sin(a)), by = EYE[1] + (ER + 0.01) * Math.cos(a), bz = 0.47;
    d = Math.min(d, roundCone(x, y, z, [bx, by, bz], [bx + s * 0.055 * Math.sin(a), by + 0.06 * Math.cos(a) + 0.01, bz + 0.02], 0.016, 0.01));
  }
  return d;
}

function headSdf(x, y, z){
  let d = ellipsoid(x, y, z, 0, 0, 0, 0.66, 0.62, 0.58);
  d = smin(d, trunkSdf(x, y, z), 0.14);
  d = sub(d, tipHole(x, y, z), 0.02);
  d = smin(d, bowSdf(x, y, z), 0.02);
  d = smin(d, lashSdf(x, y, z), 0.008);
  return d;
}
function headPaint(x, y, z){
  let c = C.body;
  c = layer(c, Math.min(sphere(x, y, z, 0.45, -0.27, 0.37, 0.11), sphere(x, y, z, -0.45, -0.27, 0.37, 0.11)), C.cheek, 0.006);
  c = layer(c, bowSdf(x, y, z) - 0.012, C.bow, 0.01);
  c = layer(c, lashSdf(x, y, z) - 0.006, C.lash, 0.004);
  c = layer(c, tipHole(x, y, z) - 0.015, C.tip, 0.01);
  return c;
}

// ---------- orelha ----------
const earSdf = s => (x, y, z) => {
  let d = smin(ellipsoid(x, y, z, s * 0.33, 0.1, 0, 0.31, 0.4, 0.08), ellipsoid(x, y, z, s * 0.3, -0.2, 0, 0.25, 0.32, 0.075), 0.18);
  d = sub(d, ellipsoid(x, y, z, s * 0.33, -0.04, 0.085, 0.235, 0.43, 0.06), 0.035); // concha rosa
  return d;
};
const earPaint = s => (x, y, z) => layer(C.body, Math.max(ellipsoid(x, y, z, s * 0.33, -0.04, 0.045, 0.24, 0.44, 0.1), -z + 0.005), C.ear, 0.01);

// ---------- corpo ----------
function bodySdf(x, y, z){
  let d = smin(ellipsoid(x, y, z, 0, 0.56, 0, 0.44, 0.43, 0.4), ellipsoid(x, y, z, 0, 0.84, 0, 0.35, 0.3, 0.33), 0.18);
  let t = tube(x, y, z, [[0, 0.56, -0.36], [0, 0.46, -0.5], [0, 0.37, -0.55]], [0.04, 0.03, 0.026], 0.02);
  t = smin(t, ellipsoid(x, y, z, 0, 0.3, -0.56, 0.05, 0.08, 0.05), 0.02);
  return smin(d, t, 0.03);
}
const bodyPaint = (x, y, z) => layer(C.body, ellipsoid(x, y, z, 0, 0.56, 0.3, 0.3, 0.31, 0.2), C.belly, 0.012);

// ---------- braço ----------
const armNails = s => [-0.045, 0, 0.045].map(dx => [s * 0.11 + dx, -0.47, 0.08]);
const armSdf = s => (x, y, z) => {
  let d = roundCone(x, y, z, [0, 0, 0], [s * 0.11, -0.38, 0.04], 0.12, 0.115);
  for (const n of armNails(s)) d = smin(d, sphere(x, y, z, n[0], n[1], n[2], 0.032), 0.012);
  return d;
};
const armPaint = s => (x, y, z) => {
  let c = C.body;
  for (const n of armNails(s)) c = layer(c, sphere(x, y, z, n[0], n[1], n[2], 0.036), C.nail, 0.006);
  return c;
};

// ---------- perna ----------
const LEG_NAILS = [-0.1, -0.035, 0.035, 0.1].map(dx => [dx, 0.05, 0.15]);
function legSdf(x, y, z){
  let d = roundCone(x, y, z, [0, 0.1, 0], [0, 0.42, 0], 0.165, 0.17);
  for (const n of LEG_NAILS) d = smin(d, sphere(x, y, z, n[0], n[1], n[2], 0.04), 0.015);
  return inter(d, -y, 0.02);
}
function legPaint(x, y, z){
  let c = C.body;
  for (const n of LEG_NAILS) c = layer(c, sphere(x, y, z, n[0], n[1], n[2], 0.044), C.nail, 0.006);
  return c;
}

export function makeElephant(fx){
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  body.add(sculptMesh({ bounds: [[-0.52, 0.08, -0.68], [0.52, 1.2, 0.5]], step: 0.022, sdf: bodySdf, paint: bodyPaint }));

  const arms = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(s * 0.37, 0.98, 0.02); p.userData.side = s;
    p.add(sculptMesh({ bounds: [[-0.18 + s * 0.07, -0.68, -0.16], [0.18 + s * 0.07, 0.14, 0.18]], step: 0.014, sdf: armSdf(s), paint: armPaint(s) }));
    body.add(p); arms.push(p);
  });

  const head = new THREE.Group(); head.position.set(0, 1.64, 0.02); head.scale.setScalar(1.06); body.add(head);
  head.add(sculptMesh({ bounds: [[-0.72, -0.76, -0.66], [0.72, 0.86, 0.86]], step: 0.018, sdf: headSdf, paint: headPaint }));

  const ears = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(s * 0.5, 0.06, -0.1); p.rotation.y = s * 0.3; p.userData.side = s;
    p.add(sculptMesh({ bounds: [[s > 0 ? -0.04 : -0.68, -0.6, -0.12], [s > 0 ? 0.68 : 0.04, 0.58, 0.15]], step: 0.014, sdf: earSdf(s), paint: earPaint(s) }));
    head.add(p); ears.push(p);
  });

  const eyes = [];
  [-1, 1].forEach(s => {
    const e = makeEye({ r: ER, depth: 0.8, pupil: [0.68, 0.68], pupilOffset: [0, -0.02], side: s });
    e.position.set(s * EYE[0], EYE[1], EYE[2]); e.rotation.y = s * 0.35;
    head.add(e); eyes.push(e);
  });
  const tip = new THREE.Object3D(); tip.position.set(0.25, -0.51, 0.65); head.add(tip);

  const legs = [];
  [-1, 1].forEach(s => {
    const f = new THREE.Group(); f.position.set(s * 0.22, 0, 0.02);
    f.add(sculptMesh({ bounds: [[-0.22, -0.01, -0.22], [0.22, 0.62, 0.24]], step: 0.016, sdf: legSdf, paint: legPaint }));
    root.add(f); legs.push(f);
  });

  const walk = biped({ body, head, arms, legs }, { sway: 0.08, bounce: 0.06, stride: 0.16, rate: 0.8 });
  let happy = 0, sprayT = 0, autoSpray = 3;
  return {
    name: 'elephant', root, head, eyes, bubbleUp: 1.2, sink: 0.6, jump: 3.6, walkRate: 0.75, heavy: true,
    words: ['Tuuuu!', 'Fuuum!'],
    speak(g){ happy = g ? 0.6 : 1; sprayT = g ? 0 : 0.6; fx.trumpet(); },
    anim(s, dt){
      walk(s, dt, this.sink);
      happy = Math.max(0, happy - dt * 0.9);
      const h = Math.min(1, happy * 2.2);
      head.rotation.x -= h * 0.22;
      ears.forEach(e => e.rotation.y = e.userData.side * (0.35 + Math.sin(s.t * 2.6 + e.userData.side) * 0.07 + h * 0.3 * Math.sin(s.t * 16)));
      if (s.swim > 0.6 && s.sleep < 0.2){ autoSpray -= dt; if (autoSpray <= 0){ happy = 1; sprayT = 0.5; autoSpray = 3.5 + Math.random() * 2; } }
      if (sprayT > 0 && h > 0.5){ sprayT -= dt; for (let k = 0; k < 3; k++) fx.spawnDrop(tip, root.rotation.y); }
    }
  };
}
