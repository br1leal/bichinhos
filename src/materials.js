import * as THREE from 'three';

export const mat = (color, rough=0.7) => new THREE.MeshStandardMaterial({ color, roughness:rough, metalness:0 });
export const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };

// peças comuns
export const black = mat(0x1a1a1a, 0.3);
export const white = new THREE.MeshBasicMaterial({ color:0xffffff });
export const cheekMat = new THREE.MeshStandardMaterial({ color:0xff9bb0, roughness:0.8, transparent:true, opacity:0.75 });
export function addEyes(head, x, y, z, size){
  const eyes = [];
  [-1,1].forEach(s=>{
    const e = new THREE.Group(); e.position.set(s*x, y, z);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), black));
    const sp = new THREE.Mesh(new THREE.SphereGeometry(size*0.34, 8, 6), white);
    sp.position.set(size*0.3, size*0.38, size*0.75); e.add(sp);
    head.add(e); eyes.push(e);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(size*0.95, 12, 8), cheekMat);
    cheek.scale.set(1, 0.6, 0.4); cheek.position.set(s*(x+0.13), y-0.19, z-0.09);
    cheek.lookAt(cheek.position.clone().multiplyScalar(3)); head.add(cheek);
  });
  return eyes;
}

