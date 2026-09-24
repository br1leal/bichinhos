import * as THREE from 'three';
import { mat, shadowy, black, white, cheekMat, addEyes } from '../materials.js';

// ================= patinho =================
export function makeDuck(fx){
  const yellow = mat(0xffd43b, 0.55), yellowDeep = mat(0xf7c21a, 0.6), orange = mat(0xff8f1f, 0.5);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const torso = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 24), yellow));
  torso.scale.set(1, 0.82, 1.18); torso.position.y = 0.85; body.add(torso);
  const tail = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 16), yellow));
  tail.position.set(0, 1.1, -0.95); tail.rotation.x = -Math.PI/3; body.add(tail);

  const wings = [];
  [-1,1].forEach(s=>{
    const pivot = new THREE.Group(); pivot.position.set(s*0.72, 1.0, -0.05);
    const w = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), yellowDeep));
    w.scale.set(0.28, 0.62, 1); w.position.set(s*0.06, -0.15, 0); w.rotation.x = 0.25;
    pivot.add(w); pivot.userData.side = s; body.add(pivot); wings.push(pivot);
  });

  const head = new THREE.Group(); head.position.set(0, 1.72, 0.55); body.add(head);
  head.add(shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 24), yellow)));
  const tuft = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 10), yellow));
  tuft.position.set(0, 0.6, -0.05); tuft.rotation.x = -0.4; head.add(tuft);
  const tuft2 = tuft.clone(); tuft2.position.set(0.1, 0.56, -0.12); tuft2.rotation.z = -0.5; head.add(tuft2);

  const beakTop = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), orange));
  beakTop.scale.set(1, 0.34, 1.1); beakTop.position.set(0, -0.06, 0.5); head.add(beakTop);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.12, 0.3); head.add(jaw);
  const beakLow = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), orange));
  beakLow.scale.set(0.95, 0.26, 1); beakLow.position.set(0, -0.02, 0.17); jaw.add(beakLow);

  const eyes = addEyes(head, 0.23, 0.13, 0.45, 0.095);

  const feet = [];
  [-1,1].forEach(s=>{
    const f = new THREE.Group(); f.position.set(s*0.3, 0, 0.05);
    const leg = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), orange));
    leg.position.y = 0.2; f.add(leg);
    const foot = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), orange));
    foot.scale.set(1, 0.28, 1.35); foot.position.set(0, 0.05, 0.12); f.add(foot);
    root.add(f); feet.push(f);
  });

  let talkT = 0;
  return {
    name:'duck', root, head, eyes, bubbleUp:0.95, sink:0.5, jump:5.2, walkRate:1,
    words:['Quá quá!','Quá!'],
    speak(){ talkT = 0.45; fx.quack(); },
    anim(s, dt){
      const w = s.moveAmt * (1 - s.swim*0.8);
      body.rotation.z = Math.sin(s.walk) * 0.2 * w;
      body.rotation.x = -0.08 * s.moveAmt + Math.sin(s.t*2) * 0.02;
      body.position.y = Math.abs(Math.sin(s.walk))*0.12*w + Math.sin(s.t*2.4)*0.02*s.swim + s.jumpY - s.swim*this.sink;
      feet.forEach((f,i)=>{
        const sd = i ? -1 : 1;
        f.position.z = 0.05 + Math.sin(s.walk)*0.26*sd*w;
        f.position.y = Math.max(0, Math.cos(s.walk)*sd)*0.12*w + s.jumpY - s.swim*this.sink;
      });
      const flap = s.jumpY > 0.01 ? Math.sin(s.t*40)*0.6 + 0.6 : Math.sin(s.walk)*0.1*s.moveAmt;
      wings.forEach(p => p.rotation.z = p.userData.side * flap);
      head.rotation.y = Math.sin(s.t*0.8)*0.45*(1-s.moveAmt);
      head.rotation.x = Math.sin(s.t*1.7)*0.06*(1-s.moveAmt) - 0.05*s.moveAmt;
      head.rotation.z = Math.sin(s.t*0.6)*0.08*(1-s.moveAmt);
      if (talkT > 0){ talkT -= dt; jaw.rotation.x = Math.abs(Math.sin(talkT*28))*0.5; }
      else jaw.rotation.x *= 0.8;
    }
  };
}

