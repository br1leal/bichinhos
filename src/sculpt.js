import * as THREE from 'three';

// =====================================================================
// Escultura por campos de distância (SDF)
// ---------------------------------------------------------------------
// Cada personagem é descrito como uma função sdf(x, y, z) que diz a que
// distância o ponto está da superfície (negativo = dentro). As formas
// básicas se fundem com smin (união suave), como massinha, e sub() cava
// detalhes (narinas, sulcos). No fim, sculpt() transforma o campo numa
// malha lisa (surface nets), com normais e cores por vértice.
// =====================================================================

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- formas básicas ----------
export function sphere(x, y, z, cx, cy, cz, r){
  const dx = x - cx, dy = y - cy, dz = z - cz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

// elipsoide (aproximação de Inigo Quilez, ótima para formas orgânicas)
export function ellipsoid(x, y, z, cx, cy, cz, rx, ry, rz){
  const px = x - cx, py = y - cy, pz = z - cz;
  const ax = px / rx, ay = py / ry, az = pz / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = px / (rx * rx), by = py / (ry * ry), bz = pz / (rz * rz);
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
}

// "cone arredondado": um tubo que afina de r1 (em a) até r2 (em b)
export function roundCone(x, y, z, a, b, r1, r2){
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = x - a[0], pay = y - a[1], paz = z - a[2];
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2;
  const z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

// tubo que passa por vários pontos (tromba, rabo), afinando de ponto em ponto
export function tube(x, y, z, pts, radii, k = 0.04){
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++){
    const s = roundCone(x, y, z, pts[i], pts[i + 1], radii[i], radii[i + 1]);
    d = i === 0 ? s : smin(d, s, k);
  }
  return d;
}

// ---------- operações ----------
export function smin(a, b, k){ // união suave
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function sub(base, cut, k){ // cava "cut" de dentro de "base", com borda suave
  const h = clamp(0.5 - 0.5 * (base + cut) / k, 0, 1);
  return mix(base, -cut, h) + k * h * (1 - h);
}
export function inter(a, b, k){ // interseção suave
  const h = clamp(0.5 - 0.5 * (b - a) / k, 0, 1);
  return mix(b, a, h) + k * h * (1 - h);
}

// ---------- rotações de ponto (para inclinar formas) ----------
export function rotZ(x, y, a){ const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
export function rotX(y, z, a){ const c = Math.cos(a), s = Math.sin(a); return [y * c - z * s, y * s + z * c]; }
export function rotY(x, z, a){ const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, -x * s + z * c]; }

// ---------- pintura ----------
// paint(x,y,z) devolve [r,g,b]. layer() ajuda a "pintar" dentro de um volume
// com borda levemente suavizada.
const _c = new THREE.Color();
export const rgb = hex => { _c.setHex(hex); return [_c.r, _c.g, _c.b]; };
export function layer(col, d, over, soft = 0.012){
  const t = 1 - smoothstep(-soft, soft, d);
  if (t <= 0) return col;
  return [mix(col[0], over[0], t), mix(col[1], over[1], t), mix(col[2], over[2], t)];
}

// ---------- malha ----------
// bounds: [[minX,minY,minZ],[maxX,maxY,maxZ]]; step: tamanho da "grade" (menor = mais detalhe)
export function sculpt({ bounds, step, sdf, paint }){
  const [mn, mx] = bounds;
  const nx = Math.ceil((mx[0] - mn[0]) / step) + 1;
  const ny = Math.ceil((mx[1] - mn[1]) / step) + 1;
  const nz = Math.ceil((mx[2] - mn[2]) / step) + 1;
  const F = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++){
    const z = mn[2] + k * step;
    for (let j = 0; j < ny; j++){
      const y = mn[1] + j * step;
      for (let i = 0; i < nx; i++) F[id(i, j, k)] = sdf(mn[0] + i * step, y, z);
    }
  }

  const cx = nx - 1, cy = ny - 1;
  const cell = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  const cid = (i, j, k) => i + cx * (j + cy * k);
  const C = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const E = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const v = new Float32Array(8);
  const pos = [];

  // 1) um vértice por célula que cruza a superfície
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++){
    let mask = 0;
    for (let c = 0; c < 8; c++){
      v[c] = F[id(i + C[c][0], j + C[c][1], k + C[c][2])];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E){
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += C[a][0] + t * (C[b][0] - C[a][0]);
      sy += C[a][1] + t * (C[b][1] - C[a][1]);
      sz += C[a][2] + t * (C[b][2] - C[a][2]);
      n++;
    }
    cell[cid(i, j, k)] = pos.length / 3;
    pos.push(mn[0] + (i + sx / n) * step, mn[1] + (j + sy / n) * step, mn[2] + (k + sz / n) * step);
  }

  // 2) liga as células vizinhas em quadrados
  const idx = [];
  const quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++){
    if ((F[id(i, j, k)] < 0) === (F[id(i + 1, j, k)] < 0)) continue;
    quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)]);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++){
    if ((F[id(i, j, k)] < 0) === (F[id(i, j + 1, k)] < 0)) continue;
    quad(cell[cid(i - 1, j, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++){
    if ((F[id(i, j, k)] < 0) === (F[id(i, j, k + 1)] < 0)) continue;
    quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]);
  }

  // 3) encosta cada vértice na superfície e calcula normal e cor
  const nv = pos.length / 3;
  const P = new Float32Array(pos), N = new Float32Array(nv * 3), COL = new Float32Array(nv * 3);
  const h = step * 0.35;
  const grad = (x, y, z) => {
    const gx = sdf(x + h, y, z) - sdf(x - h, y, z);
    const gy = sdf(x, y + h, z) - sdf(x, y - h, z);
    const gz = sdf(x, y, z + h) - sdf(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };
  for (let q = 0; q < nv; q++){
    let x = P[q * 3], y = P[q * 3 + 1], z = P[q * 3 + 2];
    for (let it = 0; it < 2; it++){
      const d = sdf(x, y, z), g = grad(x, y, z);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
    }
    const g = grad(x, y, z);
    P[q * 3] = x; P[q * 3 + 1] = y; P[q * 3 + 2] = z;
    N[q * 3] = g[0]; N[q * 3 + 1] = g[1]; N[q * 3 + 2] = g[2];
    const c = paint(x, y, z, g);
    COL[q * 3] = c[0]; COL[q * 3 + 1] = c[1]; COL[q * 3 + 2] = c[2];
  }

  // 4) garante que todos os triângulos apontem para fora
  for (let t = 0; t < idx.length; t += 3){
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    const sx = N[a] + N[b] + N[c], sy = N[a + 1] + N[b + 1] + N[c + 1], sz = N[a + 2] + N[b + 2] + N[c + 2];
    if (fx * sx + fy * sy + fz * sz < 0){ const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(COL, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

// material fosco, tipo vinil, que usa as cores pintadas nos vértices
export const vinyl = (rough = 0.78) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });

// atalho: esculpe e já devolve um Mesh com sombra
export function sculptMesh(opts, material = vinyl()){
  const m = new THREE.Mesh(sculpt(opts), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
