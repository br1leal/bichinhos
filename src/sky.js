// Céu em camadas (CSS): sol, entardecer, noite estrelada e lua, movidos pelo valor n (0 = dia, 1 = noite).
export function createSky(){
  const skyEl = document.getElementById('nightSky');
  for (let i=0;i<80;i++){
    const st = document.createElement('span'); st.className = 'star';
    const sz = Math.random() < 0.15 ? 4 : 2 + Math.random()*1.5;
    st.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*65}%;width:${sz}px;height:${sz}px;animation-delay:${-Math.random()*3}s;animation-duration:${2+Math.random()*3}s`;
    skyEl.appendChild(st);
  }
  const sunEl = document.getElementById('sun'), moonEl = document.getElementById('moon'), duskEl = document.getElementById('dusk');
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3 - 2*t); };
  let lastSky = -1;
  function skyFx(n){
    if (Math.abs(n - lastSky) < 0.0004) return; lastSky = n;
    const sp = sm(0, 0.65, n), mp = sm(0.35, 1, n);
    sunEl.style.left = (72 + 20*sp) + '%';
    sunEl.style.top = (17 + 95*sp*sp) + '%';
    sunEl.style.opacity = 1 - sm(0.5, 0.72, n);
    sunEl.style.setProperty('--set', sm(0.05, 0.45, n).toFixed(3));
    moonEl.style.left = (9 + 7*mp) + '%';
    moonEl.style.top = (108 - 94*(1 - (1 - mp)*(1 - mp))) + '%';
    moonEl.style.opacity = sm(0.3, 0.55, n);
    duskEl.style.opacity = (Math.sin(Math.PI * Math.min(1, n)) * 0.9).toFixed(3);
    skyEl.style.opacity = mp.toFixed(3);
  }
  return skyFx;
}
