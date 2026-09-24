import * as THREE from 'three';

// Olho "de vinil": branco brilhante, pupila preta e dois pontinhos de luz.
// setLid(v): 1 = aberto, perto de 0 = fechado. Fechado vira um risquinho curvo "‿",
// que é como o olho dormindo aparece nos livrinhos.

const sclMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.14, metalness: 0 });
const pupMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.1, metalness: 0 });
const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lidMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6, metalness: 0 });

export function makeEye({ r = 0.2, depth = 0.8, pupil = [0.6, 0.6], pupilOffset = [0, 0], side = 1 }){
  const eye = new THREE.Group();
  const open = new THREE.Group(); eye.add(open);

  const scl = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), sclMat);
  scl.scale.set(1, 1, depth); open.add(scl);

  const pr = r * pupil[0], py = r * pupil[1];
  const pu = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), pupMat);
  pu.scale.set(pr, py, r * 0.32);
  pu.position.set(pupilOffset[0] * r * side, pupilOffset[1] * r, r * depth * 0.78);
  open.add(pu);

  const h1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 12, 10), shineMat);
  h1.position.set(pu.position.x + pr * 0.38, pu.position.y + py * 0.42, pu.position.z + r * 0.22);
  open.add(h1);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.075, 10, 8), shineMat);
  h2.position.set(pu.position.x - pr * 0.35, pu.position.y - py * 0.4, pu.position.z + r * 0.2);
  open.add(h2);

  // olho fechado: arquinho escuro
  const arc = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.075, 8, 24, Math.PI), lidMat);
  arc.rotation.z = Math.PI; arc.position.set(0, r * 0.15, r * depth * 0.7);
  arc.visible = false; eye.add(arc);

  eye.userData.setLid = v => {
    const closed = v < 0.3;
    open.visible = !closed; arc.visible = closed;
    open.scale.y = closed ? 1 : Math.max(0.25, v);
  };
  return eye;
}
