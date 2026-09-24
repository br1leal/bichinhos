import * as THREE from 'three';
import { sculptMesh, ellipsoid, sphere, roundCone, tube, smin, sub, inter, rgb, layer, smoothstep } from '../sculpt.js';
import { makeEye } from '../eyes.js';
import { biped } from './biped.js';

// ================= jacarezinho =================
// Referência: cabeça larga e baixa, com dois "morrinhos" em cima abrigando olhos
// enormes; focinho comprido com narinas num calombinho; boca em sorriso largo com
// o queixo verde-clarinho; dois dentinhos brancos nos cantos; bochechas rosadas;
// espinhos macios nas costas até o rabo; barriga clara com gomos; rabo grosso
// que encosta no chão.

const C = {
  body: rgb(0x69b057), light: rgb(0xc3dd82), groove: rgb(0xadcb6c), cheek: rgb(0xf3a3b4),
  nose: rgb(0x3f7a36), claw: rgb(0xf1e5c7), lip: rgb(0x4f9444)
};

// linha da boca: mais baixa no meio (o lábio de cima "desce"), sobe nos cantos
const mouthY = x => -0.27 + 0.3 * (x / 0.8) * (x / 0.8);
const NOSTRILS = [[0.07, 0.125, 1.09], [-0.07, 0.125, 1.09]];
const EYE = [0.33, 0.33, 0.4], ER = 0.33;

function spine(x, y, z, pts, size){
  let d = 1e9;
  pts.forEach((p, i) => { const k = size * (1 - i * 0.07); d = Math.min(d, ellipsoid(x, y, z, p[0], p[1], p[2], k * 0.6, k, k * 0.8)); });
  return d;
}
const HEAD_SPINE = [[0, 0.1, -0.53], [0, -0.07, -0.52], [0, -0.24, -0.48]];

function headSdf(x, y, z){
  let d = ellipsoid(x, y, z, 0, -0.1, 0.02, 0.82, 0.4, 0.6);                        // bochechas largas
  d = smin(d, smin(sphere(x, y, z, -0.34, 0.33, 0.14, 0.43), sphere(x, y, z, 0.34, 0.33, 0.14, 0.43), 0.08), 0.25); // morrinhos dos olhos
  d = smin(d, ellipsoid(x, y, z, 0, -0.16, 0.62, 0.6, 0.24, 0.6), 0.18);              // focinho
  d = smin(d, ellipsoid(x, y, z, 0, 0.05, 1.03, 0.17, 0.085, 0.13), 0.08);            // calombo das narinas
  for (const n of NOSTRILS) d = sub(d, sphere(x, y, z, n[0], n[1], n[2], 0.03) + 0.01, 0.03);
  d = inter(d, -(y + 0.5), 0.06);                                                    // queixo achatado
  d = smin(d, spine(x, y, z, HEAD_SPINE, 0.075), 0.02);
  return d;
}
function headPaint(x, y, z){
  let c = C.body;
  // queixo clarinho abaixo da linha da boca (na frente e dos lados)
  const m = mouthY(x);
  if (z > -0.15) c = layer(c, y - m, C.light, 0.02);
  // risquinho da boca
  if (z > 0.05) c = layer(c, Math.abs(y - m) - 0.01, C.lip, 0.01);
  c = layer(c, Math.min(sphere(x, y, z, 0.78, -0.04, 0.25, 0.085), sphere(x, y, z, -0.78, -0.04, 0.25, 0.085)), C.cheek, 0.006);
  for (const n of NOSTRILS) c = layer(c, sphere(x, y, z, n[0], n[1], n[2], 0.042), C.nose, 0.008);
  return c;
}

// ---------- corpo ----------
const BACK_SPINE = [[0, 1.02, -0.3], [0, 0.88, -0.36], [0, 0.74, -0.39], [0, 0.6, -0.4], [0, 0.46, -0.39]];
function bodySdf(x, y, z){
  let d = smin(ellipsoid(x, y, z, 0, 0.52, 0, 0.46, 0.42, 0.39), ellipsoid(x, y, z, 0, 0.82, 0, 0.37, 0.3, 0.33), 0.18);
  return smin(d, spine(x, y, z, BACK_SPINE, 0.065), 0.02);
}
function bodyPaint(x, y, z){
  const belly = ellipsoid(x, y, z, 0, 0.6, 0.28, 0.3, 0.34, 0.2);
  let c = layer(C.body, belly, C.light, 0.012);
  if (belly < 0) for (const yb of [0.47, 0.6, 0.73]) c = layer(c, Math.abs(y - yb) - 0.007, C.groove, 0.006);
  return c;
}

// ---------- rabo ----------
const TAIL = [[0, 0, 0], [0.05, -0.12, -0.3], [0.2, -0.27, -0.55], [0.42, -0.35, -0.72], [0.62, -0.38, -0.8]];
const TAIL_R = [0.2, 0.15, 0.1, 0.065, 0.035];
function tailSdf(x, y, z){
  let d = tube(x, y, z, TAIL, TAIL_R, 0.05);
  const bumps = [];
  for (let i = 1; i < TAIL.length - 1; i++){
    const p = TAIL[i]; bumps.push([p[0], p[1] + TAIL_R[i] * 0.95, p[2]]);
    const q = TAIL[i + 1]; bumps.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + (TAIL_R[i] + TAIL_R[i + 1]) * 0.47, (p[2] + q[2]) / 2]);
  }
  bumps.forEach((b, i) => { const k = 0.05 * (1 - i * 0.1); d = smin(d, ellipsoid(x, y, z, b[0], b[1], b[2], k * 0.6, k, k * 0.9), 0.015); });
  return d;
}
function tailPaint(x, y, z){
  // barriguinha do rabo clara: abaixo do centro do tubo
  let best = 1e9, cy = 0, rr = 0.1;
  for (let i = 0; i < TAIL.length - 1; i++){
    const a = TAIL[i], b = TAIL[i + 1];
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / (bx * bx + by * by + bz * bz)));
    const px = a[0] + bx * t, py = a[1] + by * t, pz = a[2] + bz * t;
    const dd = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2;
    if (dd < best){ best = dd; cy = py; rr = TAIL_R[i] + (TAIL_R[i + 1] - TAIL_R[i]) * t; }
  }
  return layer(C.body, y - (cy - rr * 0.35), C.light, 0.015);
}

// ---------- braço e perna ----------
const armSdf = s => (x, y, z) => roundCone(x, y, z, [0, 0, 0], [s * 0.09, -0.42, 0.05], 0.12, 0.135);
const CLAWS = [-0.07, 0, 0.07].map(dx => [dx, 0.045, 0.14]);
function legSdf(x, y, z){
  let d = roundCone(x, y, z, [0, 0.1, 0], [0, 0.42, 0], 0.15, 0.16);
  for (const n of CLAWS) d = smin(d, sphere(x, y, z, n[0], n[1], n[2], 0.042), 0.015);
  return inter(d, -y, 0.02);
}
function legPaint(x, y, z){
  let c = C.body;
  for (const n of CLAWS) c = layer(c, sphere(x, y, z, n[0], n[1], n[2], 0.046), C.claw, 0.006);
  return c;
}

export function makeGator(fx){
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  body.add(sculptMesh({ bounds: [[-0.54, 0.06, -0.52], [0.54, 1.18, 0.46]], step: 0.022, sdf: bodySdf, paint: bodyPaint }));

  const tail = new THREE.Group(); tail.position.set(0, 0.42, -0.3); body.add(tail);
  tail.add(sculptMesh({ bounds: [[-0.25, -0.45, -0.9], [0.72, 0.26, 0.22]], step: 0.018, sdf: tailSdf, paint: tailPaint }));

  const arms = [];
  [-1, 1].forEach(s => {
    const p = new THREE.Group(); p.position.set(s * 0.39, 0.95, 0.02); p.userData.side = s;
    p.add(sculptMesh({ bounds: [[-0.17 + s * 0.05, -0.7, -0.16], [0.17 + s * 0.05, 0.13, 0.2]], step: 0.014, sdf: armSdf(s), paint: () => C.body }));
    body.add(p); arms.push(p);
  });

  const head = new THREE.Group(); head.position.set(0, 1.56, 0.02); body.add(head);
  head.add(sculptMesh({ bounds: [[-0.92, -0.62, -0.68], [0.92, 0.86, 1.32]], step: 0.017, sdf: headSdf, paint: headPaint }));

  // dentinhos: pequenos cones brancos nos cantos da boca
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xfafaf2, roughness: 0.35 });
  [-1, 1].forEach(s => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 12), toothMat);
    t.rotation.x = Math.PI;
    // encontra a pele da frente do focinho nessa altura e prende o dentinho ali
    const tx = s * 0.55, ty = mouthY(0.55) - 0.06; let tz = 1.4;
    while (tz > 0 && headSdf(tx, ty, tz) > 0) tz -= 0.005;
    t.position.set(tx, ty, tz - 0.02); t.castShadow = true;
    head.add(t);
  });

  const eyes = [];
  [-1, 1].forEach(s => {
    const e = makeEye({ r: ER, depth: 0.78, pupil: [0.28, 0.44], pupilOffset: [-0.12, -0.08], side: s });
    e.position.set(s * EYE[0], EYE[1], EYE[2]); e.rotation.y = s * 0.12;
    head.add(e); eyes.push(e);
  });

  const legs = [];
  [-1, 1].forEach(s => {
    const f = new THREE.Group(); f.position.set(s * 0.22, 0, 0.02);
    f.add(sculptMesh({ bounds: [[-0.2, -0.01, -0.2], [0.2, 0.6, 0.24]], step: 0.016, sdf: legSdf, paint: legPaint }));
    root.add(f); legs.push(f);
  });

  const walk = biped({ body, head, arms, legs, tail }, { sway: 0.1, bounce: 0.08, stride: 0.18 });
  let chompT = 0;
  return {
    name: 'gator', root, head, eyes, bubbleUp: 1.0, sink: 0.55, jump: 4.6, walkRate: 1,
    words: ['Nhac nhac!', 'Oi, amiguinho!'],
    speak(){ chompT = 0.5; fx.chomp(); },
    anim(s, dt){
      walk(s, dt, this.sink);
      // "nhac": a cabeça dá duas mordidinhas no ar
      if (chompT > 0){ chompT -= dt; head.scale.y = 1 - Math.abs(Math.sin(chompT * 12.5)) * 0.06; }
      else head.scale.y += (1 - head.scale.y) * 0.3;
    }
  };
}
