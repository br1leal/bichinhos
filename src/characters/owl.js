import * as THREE from 'three';
import { mat, shadowy, black, white, cheekMat, addEyes } from '../materials.js';

// ================= corujinha =================
export function makeOwl(fx){
  const brown = mat(0xd9a877, 0.8), brownDeep = mat(0xc28e5e, 0.85), cream = mat(0xfff4e2, 0.85);
  const disc = mat(0xfffaf2, 0.8), iris = mat(0xffd764, 0.35), beakM = mat(0xe39b3a, 0.5), talon = mat(0xf0a64a, 0.6);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const torso = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 24), brown));
  torso.scale.set(1.05, 1.02, 1); torso.position.y = 0.76; body.add(torso);
  [[-0.2,1.02],[0,1.07],[0.2,1.02],[-0.1,0.95],[0.1,0.95]].forEach(([x,y]) => {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), cream); fl.position.set(x, y, 0.42); body.add(fl);
  });
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), cream);
  belly.scale.set(0.88, 1, 0.5); belly.position.set(0, 0.7, 0.36); body.add(belly);
  [[-0.14,0.85],[0.14,0.85],[0,0.66],[-0.18,0.52],[0.18,0.52]].forEach(([x,y])=>{
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), brownDeep);
    d.scale.set(1.3, 0.6, 0.4); d.position.set(x, y, 0.58 - Math.abs(x)*0.3); body.add(d);
  });
  const tail = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), brownDeep));
  tail.scale.z = 0.4; tail.position.set(0, 0.3, -0.5); tail.rotation.x = -2.4; body.add(tail);

  const feet = new THREE.Group(); feet.position.set(0, 0.06, 0.2); body.add(feet);
  [-1,1].forEach(s=>{
    for (let k=-1;k<=1;k++){
      const t = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), talon));
      t.scale.set(0.7, 0.5, 1.6); t.position.set(s*0.17 + k*0.06, 0, 0.06 + (k===0?0.03:0)); t.rotation.y = k*0.4;
      feet.add(t);
    }
  });

  const wings = [];
  [-1,1].forEach(s=>{
    const p = new THREE.Group(); p.position.set(s*0.5, 1.0, -0.05);
    const w = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), brownDeep));
    w.scale.set(1.2, 0.13, 0.62); w.position.x = s*0.56; p.add(w);
    const tipW = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), brown));
    tipW.scale.set(1.2, 0.12, 0.7); tipW.position.set(s*0.95, 0.02, -0.08); p.add(tipW);
    p.userData.side = s; body.add(p); wings.push(p);
  });

  const head = new THREE.Group(); head.position.set(0, 1.5, 0.05); body.add(head);
  head.add(shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), brown)));
  [-1,1].forEach(s=>{
    const tf = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), brown));
    tf.scale.set(0.8, 1.5, 0.7); tf.position.set(s*0.3, 0.44, -0.02); tf.rotation.z = -s*0.5; head.add(tf);
    const dsk = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), disc);
    dsk.scale.set(1, 1, 0.35); dsk.position.set(s*0.19, 0.03, 0.4); head.add(dsk);
  });
  const eyes = [];
  [-1,1].forEach(s=>{
    const e = new THREE.Group(); e.position.set(s*0.19, 0.04, 0.46);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), iris));
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), black); pu.position.z = 0.07; e.add(pu);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), white); sp.position.set(0.05, 0.06, 0.17); e.add(sp);
    const sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), white); sp2.position.set(-0.04, -0.04, 0.18); e.add(sp2);
    head.add(e); eyes.push(e);
    const ck = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), cheekMat); ck.scale.set(1, 0.6, 0.4); ck.position.set(s*0.33, -0.14, 0.38); head.add(ck);
  });
  const beak = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), beakM));
  beak.scale.setScalar(0.75); beak.rotation.x = Math.PI + 0.35; beak.position.set(0, -0.13, 0.52); head.add(beak);
  [[0,0.52,0.05],[0.1,0.49,0.1],[-0.1,0.49,0.1]].forEach(([x,y,z]) => { const fz = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), brown); fz.position.set(x,y,z); head.add(fz); });
  body.scale.setScalar(0.78);

  let alt = 2.3, spread = 1, flapPh = 0, prevYaw = 0, flipT = 0, headIn = 6, turnT = 0;
  return {
    name:'owl', root, head, eyes, bubbleUp:0.75, sink:0, jump:0, flies:true, sleepDrop:0,
    words:['Uhuu!','Uhu-uhuuu!'], nightWords:['Uhuu... boa noite!','Shhh... 🌙'],
    speak(g){ if (!g) flipT = 0.9; fx.hoot(); },
    anim(s, dt){
      const wantAir = s.sleep < 0.2 && (s.idle < 3 || s.swim > 0.3 || flipT > 0);
      alt += ((wantAir ? 1.6 : 0) - alt) * Math.min(1, dt * 2.5);
      spread += ((alt > 0.15 ? 1 : 0) - spread) * Math.min(1, dt * 6);
      flapPh += dt * (9 + s.moveAmt * 7) * spread;
      body.position.y = alt + Math.sin(flapPh) * 0.08 * spread;
      wings.forEach(w => {
        const sd = w.userData.side;
        w.rotation.z = sd * (spread * (Math.sin(flapPh) * 0.8 + 0.1) + (1 - spread) * -1.35);
      });
      let yr = s.yaw - prevYaw; yr = Math.atan2(Math.sin(yr), Math.cos(yr)); prevYaw = s.yaw;
      const bank = Math.max(-0.5, Math.min(0.5, -yr / Math.max(dt, 0.001) * 0.12));
      body.rotation.z += (bank * spread - body.rotation.z) * Math.min(1, dt * 5);
      body.rotation.x = 0.35 * s.moveAmt * spread;
      if (flipT > 0){ flipT -= dt; body.rotation.x -= (1 - Math.max(0, flipT) / 0.9) * Math.PI * 2; }
      feet.rotation.x = spread * 0.9;

      // gira a cabeça bem pra trás (coisa de coruja)
      if (spread < 0.2 && s.sleep < 0.2 && turnT <= 0){ headIn -= dt; if (headIn <= 0){ turnT = 2.4; headIn = 6 + Math.random()*4; } }
      if (turnT > 0){
        turnT -= dt;
        const q = 2.4 - turnT;
        const k = q < 0.5 ? q / 0.5 : q < 1.9 ? 1 : Math.max(0, (2.4 - q) / 0.5);
        head.rotation.y = Math.PI * 0.95 * (k * k * (3 - 2 * k));
      } else {
        head.rotation.y = Math.sin(s.t * 0.8) * 0.35 * (1 - s.moveAmt);
      }
      head.rotation.z = Math.sin(s.t * 0.9) * 0.15 * (1 - s.moveAmt);
      head.rotation.x = 0;
    }
  };
}

