import * as THREE from 'three';
import { mat, shadowy, black, white, cheekMat, addEyes } from '../materials.js';

// ================= leãozinho =================
export function makeLion(fx){
  const gold = mat(0xf4b54c, 0.7), goldDeep = mat(0xe3a03a, 0.75);
  const mane = mat(0xc8662a, 0.9), cream = mat(0xfff0d2, 0.7);
  const nose = mat(0x7a3b2e, 0.4), tongue = mat(0xff7f96, 0.6), earIn = mat(0xffb3a1, 0.8);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const torso = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.74, 32, 24), gold));
  torso.scale.set(1, 0.85, 1.3); torso.position.y = 0.95; body.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), cream);
  belly.scale.set(0.85, 0.6, 1.1); belly.position.set(0, 0.72, 0.1); body.add(belly);

  const legs = [];
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>{
    const pivot = new THREE.Group(); pivot.position.set(sx*0.36, 0.62, sz*0.52);
    const leg = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.55, 14), gold));
    leg.position.y = -0.3; pivot.add(leg);
    const paw = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), cream));
    paw.scale.set(1, 0.6, 1.25); paw.position.set(0, -0.57, 0.05); pivot.add(paw);
    pivot.userData.phase = (sx*sz > 0) ? 0 : Math.PI;
    body.add(pivot); legs.push(pivot);
  });

  const tailP = new THREE.Group(); tailP.position.set(0, 1.1, -0.9); body.add(tailP);
  const tail = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 8), gold));
  tail.position.y = 0.4; tailP.add(tail);
  const tuft = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mane));
  tuft.scale.set(1, 1.3, 1); tuft.position.y = 0.82; tailP.add(tuft);

  const head = new THREE.Group(); head.position.set(0, 1.65, 0.78); body.add(head);
  const maneG = new THREE.Group(); maneG.position.z = -0.14; head.add(maneG);
  for (let ring=0; ring<2; ring++){
    const n = ring ? 11 : 14, rad = ring ? 0.46 : 0.6, r = ring ? 0.2 : 0.24;
    for (let i=0;i<n;i++){
      const a = i/n*Math.PI*2 + ring*0.2;
      const m = shadowy(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), ring ? goldDeep : mane));
      m.position.set(Math.cos(a)*rad, Math.sin(a)*rad, -ring*0.12);
      maneG.add(m);
    }
  }
  head.add(shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), gold)));
  [-1,1].forEach(s=>{
    const e = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), gold));
    e.scale.set(1, 1, 0.55); e.position.set(s*0.34, 0.4, 0.05); head.add(e);
    const i = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), earIn);
    i.scale.set(1, 1, 0.4); i.position.set(s*0.34, 0.4, 0.12); head.add(i);
    const mz = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), cream));
    mz.scale.set(1, 0.8, 0.8); mz.position.set(s*0.12, -0.16, 0.42); head.add(mz);
  });
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), nose);
  n.scale.set(1.3, 0.8, 0.8); n.position.set(0, -0.06, 0.56); head.add(n);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.28, 0.36); head.add(jaw);
  const chin = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), cream));
  chin.scale.set(1, 0.6, 0.9); chin.position.set(0, -0.02, 0.06); jaw.add(chin);
  const tng = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), tongue);
  tng.scale.set(1, 0.4, 1); tng.position.set(0, 0.03, 0.1); jaw.add(tng);

  const eyes = addEyes(head, 0.2, 0.1, 0.44, 0.085);

  let happy = 0;
  return {
    name:'lion', root, head, eyes, bubbleUp:1.05, sink:0.55, jump:5.8, walkRate:1,
    words:['Rooar!','Grrr!','Miau... ops, ROAR!'],
    speak(){ happy = 1; fx.roar(); },
    anim(s, dt){
      const w = s.moveAmt * (1 - s.swim*0.8);
      const ph = s.walk * 0.9;
      body.rotation.z = Math.sin(ph) * 0.06 * w;
      body.rotation.x = Math.sin(ph*2) * 0.05 * w;
      body.position.y = Math.abs(Math.sin(ph))*0.14*w + s.jumpY - s.swim*this.sink;
      legs.forEach(l => l.rotation.x = Math.sin(ph + l.userData.phase) * 0.6 * w - (s.jumpY > 0.05 ? 0.5 * Math.sign(l.position.z) : 0));
      tailP.rotation.x = -0.7 + Math.sin(s.t*2)*0.1;
      tailP.rotation.z = Math.sin(s.t*3.2) * 0.5 + Math.sin(ph)*0.3*w;
      happy = Math.max(0, happy - dt*1.6);
      const h = Math.min(1, happy*2);
      jaw.rotation.x = h * (0.4 + Math.abs(Math.sin(s.t*30))*0.15);
      maneG.scale.setScalar(1 + h*0.12 + Math.sin(s.t*40)*0.04*h);
      head.rotation.y = Math.sin(s.t*0.9)*0.4*(1-s.moveAmt);
      head.rotation.x = Math.sin(s.t*1.8)*0.05 - h*0.2;
      head.rotation.z = Math.sin(s.t*0.7)*0.12*(1-s.moveAmt) + Math.sin(s.t*25)*0.06*h;
    }
  };
}

