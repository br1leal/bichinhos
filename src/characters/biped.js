// Animação de quem anda em duas patinhas (pato, elefante, jacaré).
// Recebe as partes articuladas e devolve uma função que é chamada a cada quadro.
export function biped(parts, o = {}){
  const { body, head, arms = [], legs = [], tail } = parts;
  const sway = o.sway ?? 0.12, bounce = o.bounce ?? 0.09, stride = o.stride ?? 0.2;
  const lift = o.lift ?? 0.09, swing = o.swing ?? 0.35, rate = o.rate ?? 1;
  const legBase = legs.map(l => l.position.clone());

  return function(s, dt, sink){
    const w = s.moveAmt * (1 - s.swim * 0.8);
    const ph = s.walk * rate;
    // gingado do corpo e respiração quando parado
    body.rotation.z = Math.sin(ph) * sway * w;
    body.rotation.x = -0.05 * s.moveAmt + Math.sin(s.t * 2) * 0.012;
    const breathe = Math.sin(s.t * 2.2) * 0.012 * (1 - s.moveAmt);
    body.position.y = Math.abs(Math.sin(ph)) * bounce * w + breathe + s.jumpY - s.swim * sink;
    // passinhos
    legs.forEach((l, i) => {
      const sd = i ? -1 : 1;
      l.position.z = legBase[i].z + Math.sin(ph) * stride * sd * w;
      l.position.y = Math.max(0, Math.cos(ph) * sd) * lift * w + s.jumpY - s.swim * sink;
    });
    // bracinhos balançam; no pulo abrem um pouco
    const up = s.jumpY > 0.01 ? Math.sin(s.t * 30) * 0.35 + 0.45 : 0;
    arms.forEach((a, i) => {
      const sd = a.userData.side;
      a.rotation.x = -Math.sin(ph) * swing * sd * w;
      a.rotation.z = sd * (up + Math.sin(s.t * 1.6 + i) * 0.03);
    });
    // cabeça olha em volta quando parado
    head.rotation.y = Math.sin(s.t * 0.8) * 0.28 * (1 - s.moveAmt);
    head.rotation.x = Math.sin(s.t * 1.7) * 0.035 * (1 - s.moveAmt) - 0.03 * s.moveAmt;
    head.rotation.z = Math.sin(s.t * 0.6) * 0.05 * (1 - s.moveAmt) + Math.sin(ph) * 0.05 * w;
    if (tail) tail.rotation.y = Math.sin(s.t * 2.4) * 0.12 + Math.sin(ph) * 0.2 * w;
  };
}
