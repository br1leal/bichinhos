import * as THREE from 'three';
import { mat, shadowy, black, white, cheekMat, addEyes } from '../materials.js';

// ================= elefante =================
export function makeElephant(fx){
  const gray = mat(0xa9b6cf, 0.75), grayDeep = mat(0x93a1bd, 0.8);
  const earPink = mat(0xf6a9c3, 0.8), nail = mat(0xf4efe6, 0.6);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const torso = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 24), gray));
  torso.scale.set(1, 0.86, 1.22); torso.position.y = 1.15; body.add(torso);

  // pernas
  const legs = [];
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>{
    const pivot = new THREE.Group(); pivot.position.set(sx*0.46, 0.78, sz*0.55);
    const leg = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.72, 16), gray));
    leg.position.y = -0.4; pivot.add(leg);
    const foot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 16), grayDeep));
    foot.position.y = -0.74; pivot.add(foot);
    if (sz > 0) for (let k=-1;k<=1;k++){
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), nail);
      n.scale.set(1,0.7,0.6); n.position.set(k*0.12, -0.72, 0.24); pivot.add(n);
    }
    pivot.userData.phase = (sx*sz > 0) ? 0 : Math.PI;
    body.add(pivot); legs.push(pivot);
  });

  // rabinho
  const tailP = new THREE.Group(); tailP.position.set(0, 1.35, -1.12); body.add(tailP);
  const tail = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), grayDeep));
  tail.position.y = -0.25; tailP.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), grayDeep);
  tuft.position.y = -0.52; tailP.add(tuft);
  tailP.rotation.x = -0.5;

  // cabeça
  const head = new THREE.Group(); head.position.set(0, 1.72, 0.95); body.add(head);
  head.add(shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.64, 32, 24), gray)));

  const ears = [];
  [-1,1].forEach(s=>{
    const p = new THREE.Group(); p.position.set(s*0.5, 0.08, -0.12);
    const outer = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), gray));
    outer.scale.set(0.14, 0.95, 0.85); outer.position.set(s*0.26, -0.05, -0.12); p.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 14), earPink);
    inner.scale.set(0.1, 0.9, 0.8); inner.position.set(s*0.3, -0.07, -0.02); p.add(inner);
    p.userData.side = s; head.add(p); ears.push(p);
  });

  // tromba em segmentos
  const segs = [];
  let parent = new THREE.Group(); parent.position.set(0, -0.12, 0.52); head.add(parent);
  const N = 6;
  for (let i=0;i<N;i++){
    const g = new THREE.Group();
    const r0 = 0.2 - i*0.02, r1 = 0.2 - (i+1)*0.02, L = 0.24;
    const m = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L+0.04, 14), gray));
    m.position.y = L/2; g.add(m);
    parent.add(g); segs.push(g);
    const next = new THREE.Group(); next.position.y = L; g.add(next); parent = next;
  }
  const tipRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 16), grayDeep);
  tipRing.rotation.x = Math.PI/2; tipRing.position.y = 0.02; parent.add(tipRing);
  const tip = new THREE.Object3D(); tip.position.y = 0.05; parent.add(tip);

  const eyes = addEyes(head, 0.26, 0.17, 0.52, 0.1);

  // lacinho no topo (surpresa)
  const bowMat = mat(0xff6fa5, 0.6);
  const bow = new THREE.Group(); bow.position.set(0.28, 0.58, 0.05); bow.rotation.z = -0.4;
  [-1,1].forEach(s=>{
    const b = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 12), bowMat));
    b.rotation.z = s * Math.PI/2; b.position.x = s*0.13; bow.add(b);
  });
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), bowMat));
  head.add(bow);

  let happy = 0, sprayT = 0, autoSpray = 3;
  const rest = [1.85, 0.28, 0.26, 0.22, 0.18, -0.1];
  const up =   [0.55, -0.35, -0.4, -0.45, -0.5, -0.5];
  return {
    name:'elephant', root, head, eyes, bubbleUp:1.1, sink:0.75, jump:3.6, walkRate:0.75, heavy:true,
    words:['Tuuuu!','Fuuum!'],
    speak(g){ happy = g ? 0.6 : 1; sprayT = g ? 0 : 0.6; fx.trumpet(); },
    anim(s, dt){
      const w = s.moveAmt * (1 - s.swim*0.7);
      const ph = s.walk * 0.75;
      body.rotation.z = Math.sin(ph) * 0.07 * w;
      body.rotation.x = Math.sin(s.t*1.5)*0.015;
      body.position.y = Math.abs(Math.sin(ph))*0.07*w + s.jumpY - s.swim*this.sink;
      legs.forEach(l => l.rotation.x = Math.sin(ph + l.userData.phase) * 0.45 * w);
      ears.forEach(e => e.rotation.y = e.userData.side * (0.15 + Math.sin(s.t*3 + e.userData.side)*0.18 + happy*0.4*Math.sin(s.t*18)));
      tailP.rotation.z = Math.sin(s.t*4) * 0.45;
      head.rotation.y = Math.sin(s.t*0.7)*0.35*(1-s.moveAmt);
      head.rotation.x = Math.sin(s.t*1.4)*0.05 - happy*0.25;

      happy = Math.max(0, happy - dt*0.9);
      const h = Math.min(1, happy*2.2);
      segs.forEach((g,i) => {
        g.rotation.x = rest[i]*(1-h) + up[i]*h + Math.sin(s.t*1.6 + i*0.6)*0.1*(1-h);
        g.rotation.z = Math.sin(s.t*1.1 + i*0.4)*0.06*(1-h);
      });

      // borrifa água
      if (s.swim > 0.6 && s.sleep < 0.2){ autoSpray -= dt; if (autoSpray <= 0){ happy = 1; sprayT = 0.5; autoSpray = 3.5 + Math.random()*2; } }
      if (sprayT > 0 && h > 0.6){
        sprayT -= dt;
        for (let k=0;k<3;k++) fx.spawnDrop(tip, s.yaw);
      }
    }
  };
}

