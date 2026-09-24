import * as THREE from 'three';

// =====================================================================
// Historinha "encontrar os amiguinhos" (campo aberto)
// ---------------------------------------------------------------------
// 1. O patinho anda pelo campo. No topo, a silhueta de quem falta.
// 2. Uma setinha ao redor do patinho, na tela, aponta para o próximo amigo.
// 3. Chegando perto, o amigo diz "Oi! Toca em mim!"; tocando nele, ele
//    entra na turma e passa a seguir o patinho. A câmera afasta um pouco
//    para caber todo mundo.
// 4. Com todos juntos, anoitece sozinho: a turma dorme e a corujinha chega
//    voando para cuidar de todos. Tocar nela só faz "uhuu uhuu".
// =====================================================================

const EMOJI = { duck: '🐥', elephant: '🐘', gator: '🐊' };
const BIPEDS = ['duck', 'elephant', 'gator'];
const SPOTS = [[5.5, -8], [-8.5, -15]];   // onde os amigos esperam (coordenadas do campo)
const NEAR = 2.9;                          // distância para o amigo "perceber" o patinho

export function createStory(ctx){
  const { scene, chars, S, CS, OFF, camera } = ctx;
  const questEl = document.getElementById('quest');
  const slotsEl = questEl.querySelector('.q-slots');
  const labelEl = questEl.querySelector('.q-label');

  // setinha de tela (fica girando ao redor do patinho)
  const finder = document.createElement('div');
  finder.id = 'finder';
  finder.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 24h24M24 12l12 12-12 12" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(finder);

  let friends = [], pending = null, doneT = -1, allFound = false;
  const v = new THREE.Vector3(), w = new THREE.Vector3();

  const target = () => friends.find(f => f.state !== 'follow');
  const worldPos = f => f.c.root.getWorldPosition(v);

  // ---------- corujinha ----------
  const owl = ctx.owl;
  const O = { state: 'away', pos: new THREE.Vector3(), goal: new THREE.Vector3(), lid: 1, blink: 3, blinkT: 0, faceYaw: 0,
              fs: { t: 0, walk: 0, moveAmt: 0, swim: 0, jumpY: 0, yaw: 0, idle: 0, sleep: 0 } };
  owl.root.visible = false;

  function clear(){
    friends.forEach(f => {
      if (f.item) ctx.getField().remove(f.item);
      scene.attach(f.c.root);
      f.c.root.position.set(0, 0, 0); f.c.root.rotation.set(0, 0, 0); f.c.root.visible = false;
    });
    friends = []; slotsEl.innerHTML = ''; doneT = -1; allFound = false;
  }
  function reset(lead){ clear(); pending = lead; questEl.hidden = true; finder.classList.remove('show'); }

  function setup(lead){
    if (!BIPEDS.includes(lead)) return;
    const field = ctx.getField();
    BIPEDS.filter(b => b !== lead).forEach((name, i) => {
      const c = chars[name];
      c.root.visible = true; c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.scale.setScalar(CS);
      // o amigo vira um "enfeite" do campo até ser encontrado (desliza junto com o chão)
      const item = field.add(c.root, OFF.x + SPOTS[i][0], OFF.z + SPOTS[i][1], (Math.random() - 0.5) * 0.8);
      const slot = document.createElement('span'); slot.className = 'slot'; slot.textContent = EMOJI[name];
      slotsEl.appendChild(slot);
      friends.push({
        c, name, item, slot, state: 'wait', greeted: false,
        fs: { t: Math.random() * 10, walk: 0, moveAmt: 0, swim: 0, jumpY: 0, jumpV: 0, yaw: 0, idle: 0, sleep: 0 },
        lid: 1, blink: 2 + Math.random() * 2, blinkT: 0, pos: new THREE.Vector3(), goal: new THREE.Vector3(), faceYaw: 0, hasGoal: false
      });
    });
    field.update(OFF); // já posiciona os amigos no campo
    labelEl.textContent = 'Encontre';
    questEl.hidden = false;
    refreshHud();
  }

  function refreshHud(){
    const t = target();
    friends.forEach(f => { f.slot.classList.toggle('found', f.state === 'follow'); f.slot.classList.toggle('next', f === t); });
    if (!t && friends.length) labelEl.textContent = 'Todos juntos!';
  }

  // toque: corujinha só faz "uhuu"; amigo pertinho entra na turma
  function tryTap(raycaster){
    if (O.state !== 'away' && raycaster.intersectObject(owl.root, true).length){
      owl.speak(true); ctx.say('Uhuu... uhuu!', 1600, owl); return true;
    }
    if (ctx.night()) return false;
    for (const f of friends){
      if (f.state !== 'near') continue;
      if (raycaster.intersectObject(f.c.root, true).length){ join(f); return true; }
    }
    return false;
  }

  function join(f){
    f.state = 'follow';
    f.c.root.scale.setScalar(CS);
    f.c.speak(true);
    f.fs.jumpV = f.c.jump * 0.6;
    ctx.say('Vamos juntos!', 1500, f.c);
    ctx.zoomOut();               // afasta um pouco para caber a turma
    refreshHud();
    if (!target()){ doneT = 0; allFound = true; }
  }

  function animFriend(c, fs, f, dt){
    c.anim(fs, dt);
    c.head.rotation.x += fs.sleep * 0.35;
    f.blink -= dt;
    if (f.blink <= 0){ f.blinkT = 0.14; f.blink = 2 + Math.random() * 3; }
    if (f.blinkT > 0) f.blinkT -= dt;
    let lid = f.blinkT > 0 ? 0.12 : 1;
    if (fs.sleep > 0.5) lid = 0.08;
    f.lid += (lid - f.lid) * 0.6;
    c.eyes.forEach(e => e.userData.setLid ? e.userData.setLid(f.lid) : (e.scale.y = f.lid));
  }

  // anda até f.goal (coordenadas de tela/mundo, em volta do patinho), sempre de frente
  function moveTo(f, c, fs, dt, mover){
    const dx = f.goal.x - f.pos.x, dz = f.goal.z - f.pos.z, dist = Math.hypot(dx, dz);
    const step = Math.min(dist, dt * (1.8 + dist * 2.2));
    if (dist > 0.01){ f.pos.x += dx / dist * step; f.pos.z += dz / dist * step; }
    const own = step / Math.max(dt, 1e-4);
    fs.moveAmt += (Math.min(1, Math.max(S.moveAmt, own / 3)) - fs.moveAmt) * Math.min(1, dt * 8);
    fs.walk += dt * (6 + 2.2 * Math.max(S.moveAmt * 3, own)) * fs.moveAmt;
    c.root.position.set(f.pos.x, -fs.sleep * (c.sleepDrop || 0), f.pos.z);
    const turn = own > 0.3 ? Math.max(-0.6, Math.min(0.6, dx * 0.3)) : Math.sin(mover.yaw) * 0.55 * S.moveAmt;
    f.faceYaw += (turn - f.faceYaw) * Math.min(1, dt * 6);
    c.root.rotation.set(0, f.faceYaw, 0);
  }

  function update(dt){
    if (pending && !ctx.getPrev()){ const l = pending; pending = null; setup(l); }
    const night = ctx.night();
    const mover = ctx.getMover();
    questEl.classList.toggle('dim', night);
    let fi = 0;

    friends.forEach(f => {
      const c = f.c, fs = f.fs;
      fs.t += dt;
      fs.sleep = night ? S.sleep : 0;
      if (fs.jumpV !== 0 || fs.jumpY > 0){
        fs.jumpV -= 18 * dt; fs.jumpY += fs.jumpV * dt;
        if (fs.jumpY <= 0){ fs.jumpY = 0; fs.jumpV = 0; }
      }
      if (f.state === 'near'){
        // vem para o ladinho do patinho e espera o toque, "respirando" um pouco maior
        const sd = f === friends[0] ? 1 : -1;
        f.goal.set(sd * 1.55 * CS, 0, 0.3 * CS);
        moveTo(f, c, fs, dt, mover);
        c.root.scale.setScalar(CS * (1 + Math.sin(fs.t * 5) * 0.04));
      } else if (f.state === 'follow'){
        const i = fi++;
        if (S.moveAmt > 0.15 || !f.hasGoal){
          const bx = -Math.sin(mover.yaw), bz = -Math.cos(mover.yaw);
          const sx = bz, sz = -bx, sd = i % 2 ? 1 : -1;
          f.goal.set(bx * 1.4 * CS * (1 + i * 0.5) + sx * sd * 0.9 * CS, 0, bz * 1.4 * CS * (1 + i * 0.5) + sz * sd * 0.9 * CS);
          if (f.goal.z > 0.2){ f.goal.z = -0.4 * f.goal.z; f.goal.x += sd * 1.1 * CS; } // nunca tapando o patinho
          f.hasGoal = true;
        }
        moveTo(f, c, fs, dt, mover);
      } else {
        fs.moveAmt *= 0.9;
        const p = worldPos(f);
        const near = Math.hypot(p.x, p.z) < NEAR && !night;
        if (near){
          f.state = 'near';
          const p0 = p.clone();
          ctx.getField().remove(f.item); f.item = null;
          scene.add(c.root); c.root.position.copy(p0); c.root.rotation.set(0, 0, 0);
          f.pos.copy(p0);
          if (!f.greeted){ f.greeted = true; c.speak(true); ctx.say('Oi! Toca em mim!', 2400, c); }
        }
        c.root.position.y = -fs.sleep * (c.sleepDrop || 0);
      }
      animFriend(c, fs, f, dt);
    });

    // ---------- setinha de tela ----------
    const t = target();
    if (t && t.state === 'wait' && !night && !pending){
      const lead = ctx.getCur();
      lead.root.getWorldPosition(w); w.y += 1.2 * CS;
      const a = w.project(camera);
      const ax = (a.x + 1) / 2 * innerWidth, ay = (1 - a.y) / 2 * innerHeight;
      const p = worldPos(t).clone(); p.y += 1.2 * CS;
      const b = p.project(camera);
      let bx = (b.x + 1) / 2 * innerWidth, by = (1 - b.y) / 2 * innerHeight;
      if (b.z > 1){ bx = ax - (bx - ax); by = ay - (by - ay); } // atrás da câmera: inverte
      const ang = Math.atan2(by - ay, bx - ax);
      const R = Math.min(innerWidth, innerHeight) * 0.24;
      finder.style.transform = `translate(${ax + Math.cos(ang) * R}px, ${ay + Math.sin(ang) * R}px) translate(-50%, -50%) rotate(${ang}rad)`;
      finder.classList.add('show');
    } else finder.classList.remove('show');

    // ---------- todos juntos → anoitece ----------
    if (doneT >= 0){
      doneT += dt;
      if (doneT > 1.4 && doneT - dt <= 1.4) ctx.say('Todos juntos! 🎉', 2400, null);
      if (doneT > 5 && doneT - dt <= 5 && !night) ctx.setNight(true);
    }

    // ---------- corujinha chega com a noite ----------
    const na = ctx.nightAmt();
    if (night && na > 0.6 && O.state === 'away'){
      O.state = 'arriving';
      O.pos.set(-14, 0, -20); owl.root.position.copy(O.pos); owl.root.visible = true;
      scene.attach(owl.root); owl.root.scale.setScalar(CS);
      O.goal.set(2.4 * CS, 0, -1.3 * CS);
      ctx.say('Uhuu... chegou a corujinha!', 2600, owl);
    }
    if (!night && (O.state === 'arriving' || O.state === 'here')){
      O.state = 'leaving'; O.goal.set(16, 0, -22);
    }
    if (O.state !== 'away'){
      const fs = O.fs; fs.t += dt;
      const dx = O.goal.x - O.pos.x, dz = O.goal.z - O.pos.z, dist = Math.hypot(dx, dz);
      const step = Math.min(dist, dt * (2.2 + dist * 0.4));
      if (dist > 0.02){ O.pos.x += dx / dist * step; O.pos.z += dz / dist * step; }
      const moving = dist > 0.3;
      fs.moveAmt += ((moving ? 1 : 0) - fs.moveAmt) * Math.min(1, dt * 4);
      fs.idle = moving ? 0 : fs.idle + dt; // parada, ela pousa sozinha
      fs.yaw = Math.atan2(dx, dz);
      if (!moving && O.state === 'arriving') O.state = 'here';
      if (!moving && O.state === 'leaving'){ O.state = 'away'; owl.root.visible = false; }
      owl.root.position.copy(O.pos);
      O.faceYaw += ((moving ? Math.sin(fs.yaw) * 0.6 : 0) - O.faceYaw) * Math.min(1, dt * 4);
      owl.root.rotation.set(0, O.faceYaw, 0);
      animFriend(owl, fs, O, dt);
    }
  }

  // só para testes (?debug na URL): junta todos os amigos de uma vez
  function debugJoinAll(){
    friends.forEach(f => {
      if (f.state === 'follow') return;
      if (f.item){ const p0 = worldPos(f).clone(); ctx.getField().remove(f.item); f.item = null; scene.add(f.c.root); f.c.root.position.copy(p0); f.pos.copy(p0); }
      join(f);
    });
  }
  return { reset, update, tryTap, debugJoinAll, owlHere: () => O.state === 'here' };
}
