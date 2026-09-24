import * as THREE from 'three';
import './style.css';
import { mat, shadowy, black, white, cheekMat } from './materials.js';
import { PR, UP, place, randDir, winDay, winNight, makeWorld } from './world.js';
import { makeDuck } from './characters/duck.js';
import { makeElephant } from './characters/elephant.js';
import { makeLion } from './characters/lion.js';
import { makeOwl } from './characters/owl.js';
import { createAudio } from './audio.js';
import { createSky } from './sky.js';

const audio = createAudio({ night:() => nightOn, nightElapsed:() => S.t - nightStartT, onAutoStop:() => musicBtn.setAttribute('aria-pressed', false) });

// ================= cena =================
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const PR_SHADOW = 6.5;
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const camBase = new THREE.Vector3(), camLook = new THREE.Vector3();

const hemi = new THREE.HemisphereLight(0xffffff, 0x6aa84f, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.95);
sun.position.set(6, 7, 9);
sun.target.position.set(0, -PR_SHADOW, 0); scene.add(sun.target);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left:-9, right:9, top:9, bottom:-9, near:1, far:40 });
scene.add(sun);
const buddyLight = new THREE.PointLight(0xfff0d8, 0, 9, 1.6); buddyLight.position.set(0, 3.2, 2.6); scene.add(buddyLight);

function isDark(){
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(){
  const d = isDark();
  hemi.intensity = d ? 0.6 : 0.85;
  hemi.color.set(d ? 0xbfc8ff : 0xffffff);
  sun.intensity = d ? 0.65 : 0.95;
  sun.color.set(d ? 0xdfe3ff : 0xffffff);
}
applyTheme();
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch(e){}

let planet = null;
// MVP: todos os bichinhos no mesmo cenário (a fazenda). savanna e forest continuam em world.js para depois.
const worlds = { farm: makeWorld('farm', scene) };
const WORLD_OF = { duck:'farm', elephant:'farm', lion:'farm', owl:'farm' };
let world = worlds.farm, oldWorld = null;
planet = world.group; world.pop = 1;

const clouds = [];
const cloudMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, transparent:true, opacity:0.95 });
[[-9,6,-9],[7,7.5,-11],[12,5,-4]].forEach(([x,y,z],i)=>{
  const c = new THREE.Group();
  [[0,0,0,1.1],[1.1,-0.2,0,0.8],[-1.1,-0.25,0,0.75],[0.4,0.45,0,0.7]].forEach(([cx,cy,cz,cr])=>{
    const m = new THREE.Mesh(new THREE.SphereGeometry(cr,16,12), cloudMat);
    m.position.set(cx,cy,cz); c.add(m);
  });
  c.position.set(x,y,z); c.userData.speed = 0.25 + i*0.1; scene.add(c); clouds.push(c);
});

// ================= gotas de água =================
const drops = [];
const dropGeo = new THREE.SphereGeometry(0.07, 8, 6);
const dropMat = new THREE.MeshStandardMaterial({ color:0x8fd8ff, roughness:0.2, transparent:true, opacity:0.85 });
const tmp = new THREE.Vector3();
function spawnDrop(from, yaw){
  let d = drops.find(x => !x.visible);
  if (!d){ if (drops.length > 140) return; d = new THREE.Mesh(dropGeo, dropMat); scene.add(d); drops.push(d); }
  from.getWorldPosition(d.position);
  const f = 1.2 + Math.random()*1.4;
  d.userData.v = new THREE.Vector3(Math.sin(yaw)*f + (Math.random()-.5)*1.4, 4.5 + Math.random()*2, Math.cos(yaw)*f + (Math.random()-.5)*1.4);
  d.visible = true;
}

// ondinhas
const ripples = [];
const rippleGeo = new THREE.RingGeometry(0.85, 1, 40);
function spawnRipple(worldPos, size=1){
  const local = planet.worldToLocal(worldPos.clone()).normalize();
  const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.6, side:THREE.DoubleSide }));
  m.rotation.x = -Math.PI/2;
  const h = place(m, local, 0.05, planet, 0);
  h.userData = { life:0, size, mesh:m };
  ripples.push(h);
}
const pondW = new THREE.Vector3();
function inPondDir(n, pad=0.35){
  pondW.copy(world.pondDir).applyQuaternion(planet.quaternion);
  return n.angleTo(pondW) < world.pondAng - pad / PR;
}
const ORIGIN = new THREE.Vector3(0, 0, 0);

// ================= personagens =================
const fx = { quack:() => audio.quack(), trumpet:() => audio.trumpet(), roar:() => audio.roar(), hoot:() => audio.hoot(), spawnDrop };
const chars = { duck: makeDuck(fx), elephant: makeElephant(fx), lion: makeLion(fx), owl: makeOwl(fx) };
const ORDER = ['duck','elephant','lion','owl'];
chars.duck.sleepDrop = 0.25; chars.elephant.sleepDrop = 0.4; chars.lion.sleepDrop = 0.3;
Object.values(chars).forEach(c => { scene.add(c.root); c.root.visible = false; c.pop = 0; });
let cur = chars.duck, prev = null;
cur.root.visible = true; cur.pop = 1;

const mover = { pos:new THREE.Vector3(0,0,0), yaw:0 };
const ptr = { x:0, y:0, active:false };
let curSpeed = 0;
const axis = new THREE.Vector3(), qStep = new THREE.Quaternion();
const S = { t:0, walk:0, moveAmt:0, swim:0, jumpY:0, jumpV:0, yaw:0, idle:0, sleep:0 };
let nightAuto = false;
let lastMoveT = 0, nightOn = false, nightAmt = 0, nightStartT = 0;
const wake = () => { lastMoveT = S.t; };
// à noite, todo bichinho que não voa está dormindo: não anda e não reage ao toque
const asleep = () => nightOn && !cur.flies;

function pick(name){
  if (chars[name] === cur) { speak(); return; }
  if (prev){ prev.root.visible = false; prev = null; }
  prev = cur; cur = chars[name];
  prev.pop = 1;
  S.jumpY = 0; S.jumpV = 0;
  bubble.classList.remove('show');
  document.querySelectorAll('#picker button').forEach(b => b.setAttribute('aria-pressed', b.dataset.pick === name));
  audio.pop();
  audio.setVoice(name);
  const moving = setWorld(WORLD_OF[name]);
  cur.root.visible = true; cur.pop = 0;
  cur.delay = moving ? 1.35 : 0.3;
  cur.root.scale.setScalar(0.001);
  cur.arrive = true;
}
let arriveTimer = 0, worldT = 99;
const DROP = 15;
const easeIn = x => x*x*x, easeOut = x => 1 - Math.pow(1 - x, 3), clamp01 = x => Math.min(1, Math.max(0, x));
function setWorld(kind){
  const w = worlds[kind];
  if (w === world) return false;
  if (oldWorld){ oldWorld.group.visible = false; oldWorld.group.position.y = -PR; }
  oldWorld = world; world = w; planet = w.group;
  w.group.visible = true; w.group.scale.setScalar(1); w.group.position.y = -PR - DROP;
  worldT = 0;
  document.getElementById('skySav').classList.toggle('on', kind === 'savanna');
  document.getElementById('skyForest').classList.toggle('on', kind === 'forest');
  ripples.forEach(r => { if (r.parent) r.parent.remove(r); }); ripples.length = 0;
  drops.forEach(d => d.visible = false);
  return true;
}
document.querySelectorAll('#picker button').forEach(b => b.addEventListener('click', () => pick(b.dataset.pick)));
window.addEventListener('keydown', e => {
  const k = e.key;
  wake();
  if (k === 'n' || k === 'N'){ audio.start(); setNight(!nightOn); return; }
  if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'ArrowUp' || k === 'ArrowDown'){
    e.preventDefault(); audio.start();
    const d = (k === 'ArrowRight' || k === 'ArrowDown') ? 1 : -1;
    const i = ORDER.indexOf(cur.name);
    pick(ORDER[(i + d + ORDER.length) % ORDER.length]);
  } else if (k === ' ' && !(e.target.closest && e.target.closest('button'))){
    e.preventDefault(); audio.start(); if (!asleep()) speak();
  }
});

// ================= entrada =================
const hint = document.getElementById('hint');
let moved = 0;
function pointTo(e){
  ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
  wake();
  if (++moved === 50) hint.classList.add('hide');
}
window.addEventListener('pointermove', e => { if (!e.target.closest('button,nav')) pointTo(e); });
window.addEventListener('pointerdown', e => {
  audio.start();
  if (e.target.closest('button,nav')) return;
  pointTo(e);
  if (!asleep()) speak();
});
const stopPtr = e => { if (!e || e.pointerType !== 'mouse') ptr.active = false; };
window.addEventListener('pointerup', stopPtr);
window.addEventListener('pointercancel', () => ptr.active = false);
document.addEventListener('mouseleave', () => ptr.active = false);
window.addEventListener('blur', () => ptr.active = false);

// ================= fala / balão =================
const bubble = document.getElementById('bubble');
let bubbleTimer = 0;
const NIGHT_WORDS = ['Boa noite!','Hora de nanar...','Aaaah 🥱'];
function say(text, ms){
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
}
function speak(gentle){
  wake();
  cur.speak(gentle);
  const w = nightOn ? (cur.nightWords || NIGHT_WORDS) : cur.words;
  say(w[(Math.random()*w.length)|0], gentle ? 1400 : 950);
  if (gentle) return;
  if (!cur.flies && S.jumpY <= 0.001 && S.swim < 0.5) S.jumpV = cur.jump * (nightOn ? 0.6 : 1);
  burst(nightOn ? ['⭐','🌙','✨'] : ['💛','⭐','💛','🩷'], 3);
}
function burst(icons, n){
  const p = screenOf(cur.head, cur.bubbleUp);
  for (let i=0;i<n;i++){
    const h = document.createElement('span');
    h.className = 'heart';
    h.textContent = icons[(Math.random()*icons.length)|0];
    h.style.left = p.x + 'px'; h.style.top = p.y + 'px';
    h.style.setProperty('--dx', (Math.random()*140 - 70) + 'px');
    h.style.animationDelay = (i*0.07) + 's';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1800);
  }
}
function screenOf(obj, up){
  obj.getWorldPosition(tmp); tmp.y += up; tmp.project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return { x: rect.left + (tmp.x + 1)/2*rect.width, y: rect.top + (1 - tmp.y)/2*rect.height };
}

const musicBtn = document.getElementById('music'), soundBtn = document.getElementById('sound');
musicBtn.addEventListener('click', () => musicBtn.setAttribute('aria-pressed', audio.toggleMusic()));
soundBtn.addEventListener('click', () => soundBtn.setAttribute('aria-pressed', audio.toggleSfx()));

// ================= modo noite =================
const nightBtn = document.getElementById('night');
const goodnight = document.getElementById('goodnight');
const skyFx = createSky();
function setNight(v, auto=false){
  nightOn = v; nightStartT = S.t; nightAuto = v && auto;
  document.body.classList.toggle('night', v);
  nightBtn.setAttribute('aria-pressed', v);
  nightBtn.textContent = v ? '☀️' : '🌙';
  nightBtn.setAttribute('aria-label', v ? 'Modo dia' : 'Modo noite');
  audio.setVoice(cur.name);
  if (audio.onNight(v)) musicBtn.setAttribute('aria-pressed', true);
  wake();
  if (v && cur.flies) say('Uhuu... minha vez! 🌙', 2200);
  hint.textContent = v ? 'À noite todos dormem... menos a corujinha' : 'Aponte para onde o bichinho deve andar';
  hint.classList.remove('hide'); moved = 0;
}
nightBtn.addEventListener('click', () => { audio.start(); setNight(!nightOn); });

const dayHemi = new THREE.Color(), nightHemi = new THREE.Color(0x6a78ff);
const daySun = new THREE.Color(), nightSun = new THREE.Color(0xa9bcff);
function lights(n){
  const d = isDark();
  const sav = world.kind === 'savanna';
  dayHemi.set(d ? 0xbfc8ff : 0xffffff); daySun.set(d ? 0xdfe3ff : (sav ? 0xfff0cc : 0xffffff));
  hemi.intensity = (d ? 0.6 : 0.85) * (1 - n) + 0.28 * n;
  sun.intensity = (d ? 0.65 : 0.95) * (1 - n) + 0.3 * n;
  hemi.color.copy(dayHemi).lerp(nightHemi, n);
  sun.color.copy(daySun).lerp(nightSun, n);
}
let zIn = 0, sleepHeld = 0, yawned = false, wasAsleep = false, owlHeld = 0;
function zzz(){
  const p = screenOf(cur.head, cur.bubbleUp * 0.7);
  const z = document.createElement('span'); z.className = 'zzz';
  z.textContent = 'Z'; z.style.fontSize = (22 + Math.random()*12) + 'px';
  z.style.left = (p.x + 20) + 'px'; z.style.top = p.y + 'px';
  document.body.appendChild(z); setTimeout(() => z.remove(), 2700);
}

// ================= tamanho =================
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const k = camera.aspect < 1.1 ? Math.min(1.8, 1.05 / camera.aspect) : 1;
  const D = 13 * k, el = 0.3;
  camLook.set(0, 1.0 + (k - 1) * 0.8, 0);
  camBase.set(0, camLook.y + D * Math.sin(el), D * Math.cos(el));
  camera.position.copy(camBase);
  camera.lookAt(camLook);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ================= loop =================
const CS = 1.25;
let blinkIn = 2.5, blinkT = 0, rippleIn = 0, shake = 0;
const clock = new THREE.Clock(), dir = new THREE.Vector3();
const easeBack = x => { const c = 2.2; return 1 + (c+1)*Math.pow(x-1,3) + c*Math.pow(x-1,2); };

function frame(){
  const dt = Math.min(clock.getDelta(), 0.05); S.t += dt;

  // o bichinho fica no topo e o mundinho gira embaixo dele
  let want = 0;
  if (ptr.active && !asleep() && (S.t - lastMoveT) < 6){
    const a = screenOf(cur.root, 0.9);
    const dx = ptr.x - a.x, dy = ptr.y - a.y;
    const r = Math.hypot(dx, dy) / Math.min(window.innerWidth, window.innerHeight);
    if (r > 0.1){
      want = Math.min(cur.heavy ? 1.9 : 2.6, (r - 0.1) * 8);
      let diff = Math.atan2(dx, dy) - mover.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      mover.yaw += diff * Math.min(1, dt * (cur.heavy ? 5 : 9));
    }
  }
  curSpeed += (want - curSpeed) * Math.min(1, dt * (want > curSpeed ? 3 : 5));
  const speed = curSpeed;
  if (speed > 0.01){
    dir.set(Math.sin(mover.yaw), 0, Math.cos(mover.yaw));
    axis.crossVectors(dir, UP).normalize();
    qStep.setFromAxisAngle(axis, speed * dt / PR);
    planet.quaternion.premultiply(qStep);
  }
  S.yaw = mover.yaw;
  S.moveAmt += (Math.min(speed/3, 1) - S.moveAmt) * Math.min(1, dt*8);
  S.walk += dt * (6 + speed*2.2) * S.moveAmt;
  S.swim += ((inPondDir(UP) ? 1 : 0) - S.swim) * Math.min(1, dt*5);
  S.idle = S.t - lastMoveT;
  // dorme quando a noite já chegou (depois do bocejo); acorda devagar quando o dia volta
  const sleepWant = asleep() && nightAmt > 0.55 ? 1 : 0;
  S.sleep += (sleepWant - S.sleep) * Math.min(1, dt * (sleepWant ? 0.6 : 0.9));
  { const nt = nightOn ? 1 : 0; nightAmt += Math.sign(nt - nightAmt) * Math.min(Math.abs(nt - nightAmt), dt / 5); }
  skyFx(nightAmt);
  lights(nightAmt);
  buddyLight.intensity = 1.1 * nightAmt;
  if (asleep() && !yawned && nightAmt > 0.3 && S.sleep < 0.1){ yawned = true; say('Aaaah 🥱', 1600); }
  if (!nightOn) yawned = false;
  if (!nightOn && wasAsleep && S.sleep < 0.3){ wasAsleep = false; say('Bom dia! ☀️', 1600); }
  if (S.sleep > 0.8) wasAsleep = true;

  if (S.jumpV !== 0 || S.jumpY > 0){
    S.jumpV -= 18 * dt; S.jumpY += S.jumpV * dt;
    if (S.jumpY <= 0){
      S.jumpY = 0; S.jumpV = 0;
      if (cur.heavy){ shake = 0.25; audio.thud(); }
    }
  }

  // troca com "pop"
  [cur, prev].forEach(c => {
    if (!c) return;
    c.root.position.copy(mover.pos);
    c.root.rotation.y = mover.yaw;
    c.anim(S, dt);
    c.root.position.y = -S.sleep * (c.sleepDrop || 0);
    c.head.rotation.x += S.sleep * 0.35;
  });
  if (worldT < 2.2){
    worldT += dt;
    if (oldWorld){
      oldWorld.group.position.y = -PR - DROP * easeIn(clamp01(worldT / 0.9));
      if (worldT >= 0.9){ oldWorld.group.visible = false; oldWorld.group.position.y = -PR; oldWorld = null; }
    }
    world.group.position.y = -PR - DROP * (1 - easeOut(clamp01((worldT - 0.5) / 1.1)));
  }
  if (cur.delay > 0) cur.delay -= dt;
  else if (cur.pop < 1){ cur.pop = Math.min(1, cur.pop + dt / 0.6); if (cur.pop >= 1 && cur.arrive){ cur.arrive = false; if (!asleep()) speak(true); } }
  cur.root.scale.setScalar(CS * Math.max(0.001, easeOut(cur.pop)));
  if (prev){
    prev.pop -= dt / 0.4;
    prev.root.scale.setScalar(CS * Math.max(0.001, easeOut(Math.max(0, prev.pop))));
    if (prev.pop <= 0){ prev.root.visible = false; prev = null; }
  }

  // piscar
  blinkIn -= dt;
  if (blinkIn <= 0){ blinkT = 0.14; blinkIn = 2 + Math.random()*3; }
  if (blinkT > 0) blinkT -= dt;
  let lid = blinkT > 0 ? 0.12 : 1;
  if (nightAmt > 0.5) lid = Math.min(lid, 0.6);
  if (S.sleep > 0.5) lid = 0.08;
  cur.eyes.forEach(e => e.scale.y += (lid - e.scale.y) * 0.6);

  // ondinhas
  rippleIn -= dt;
  if (S.swim > 0.6 && rippleIn <= 0 && !cur.flies){
    spawnRipple(ORIGIN, cur.heavy ? 1.5 : 1);
    rippleIn = S.moveAmt > 0.2 ? 0.25 : 1.1;
  }
  for (let i = ripples.length - 1; i >= 0; i--){
    const r = ripples[i], u = r.userData; u.life += dt;
    const l = u.life;
    u.mesh.scale.setScalar((0.5 + l*1.3) * u.size);
    u.mesh.material.opacity = Math.max(0, 0.6 - l*0.5);
    if (l > 1.2){ if (r.parent) r.parent.remove(r); u.mesh.material.dispose(); ripples.splice(i, 1); }
  }

  // gotas
  drops.forEach(d => {
    if (!d.visible) return;
    tmp.copy(planet.position).sub(d.position).normalize();
    d.userData.v.addScaledVector(tmp, 12 * dt);
    d.position.addScaledVector(d.userData.v, dt);
    tmp.copy(d.position).sub(planet.position);
    if (tmp.length() < PR + 0.04){
      d.visible = false;
      if (inPondDir(tmp.normalize(), 0.1) && Math.random() < 0.25) spawnRipple(d.position, 0.4);
    }
  });

  // cenário
  world.glows.forEach(gl => gl.m.color.copy(gl.c).multiplyScalar(0.55 + 0.45 * nightAmt));
  world.flowers.forEach(f => f.rotation.z = Math.sin(S.t*1.5 + f.userData.phase) * 0.06);
  world.critters.forEach(c => c(S.t));
  clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 16) c.position.x = -16; });
  world.wins.forEach(m => m.color.copy(winDay).lerp(winNight, nightAmt));
  world.flies.forEach(f => {
    const u = f.userData;
    f.position.copy(u.d).multiplyScalar(PR + u.h + Math.sin(S.t*u.sp*1.7 + u.p)*0.35);
    f.position.x += Math.sin(S.t*u.sp + u.p)*0.5; f.position.z += Math.cos(S.t*u.sp*0.8 + u.p)*0.5;
    f.material.opacity = nightAmt * (0.35 + 0.65 * Math.max(0, Math.sin(S.t*2.2 + u.p*3)));
    u.glow.material.opacity = f.material.opacity * 0.3;
    f.visible = nightAmt > 0.02;
  });
  zIn -= dt;
  if (S.sleep > 0.8 && zIn <= 0){ zzz(); zIn = 1.4; }
  sleepHeld = S.sleep > 0.95 ? sleepHeld + dt : 0;
  owlHeld = nightOn && cur.flies && nightAmt > 0.95 ? owlHeld + dt : 0;
  if (sleepHeld > 2.5) goodnight.textContent = 'Shhh... o bichinho está dormindo. Boa noite! 🌙';
  else if (owlHeld > 3) goodnight.textContent = 'A corujinha fica acordada cuidando de todos 🦉';
  goodnight.classList.toggle('show', sleepHeld > 2.5 || (owlHeld > 3 && owlHeld < 9));

  // tremidinha quando o elefante cai
  if (shake > 0){
    shake = Math.max(0, shake - dt*1.2);
    camera.position.set(camBase.x + (Math.random()-.5)*shake, camBase.y + (Math.random()-.5)*shake, camBase.z);
  } else camera.position.copy(camBase);
  camera.lookAt(camLook);

  if (bubble.classList.contains('show')){
    const p = screenOf(cur.head, cur.bubbleUp);
    bubble.style.left = p.x + 'px'; bubble.style.top = p.y + 'px';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
