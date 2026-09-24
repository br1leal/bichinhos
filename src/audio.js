// Todo o som é gerado no navegador (Web Audio): sons dos bichos e músicas.
// st = { night(): bool, nightElapsed(): segundos desde que anoiteceu, onAutoStop(): música parou pelo timer de sono }
export function createAudio(st){
  // ================= áudio =================
  let ac = null, sfxOn = true, musicOn = true, fxGain, musicGain;
  function startAudio(){
    try {
      if (!ac){
        ac = new (window.AudioContext || window.webkitAudioContext)();
        fxGain = ac.createGain(); fxGain.gain.value = st.night() ? 0.5 : 1; fxGain.connect(ac.destination);
        musicGain = ac.createGain(); musicGain.gain.value = 0; musicGain.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      if (musicOn) startMusic();
    } catch(e){}
  }
  function env(g, s, peak, a, d){
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + a);
    g.gain.exponentialRampToValueAtTime(0.0001, s + a + d);
  }
  function quackSound(){
    if (!sfxOn || !ac) return;
    const t0 = ac.currentTime;
    for (let i=0;i<2;i++){
      const s = t0 + i*0.19;
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(560, s);
      o.frequency.exponentialRampToValueAtTime(320, s + 0.15);
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1150; f.Q.value = 2.5;
      const g = ac.createGain(); env(g, s, 0.4, 0.02, 0.15);
      o.connect(f); f.connect(g); g.connect(fxGain);
      o.start(s); o.stop(s + 0.2);
    }
  }
  function trumpetSound(){
    if (!sfxOn || !ac) return;
    const s = ac.currentTime;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, s);
    f.frequency.linearRampToValueAtTime(2400, s + 0.25); f.frequency.linearRampToValueAtTime(900, s + 0.8);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.3, s + 0.08);
    g.gain.setValueAtTime(0.3, s + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.85);
    f.connect(g); g.connect(fxGain);
    const lfo = ac.createOscillator(); lfo.frequency.value = 7;
    const lfoG = ac.createGain(); lfoG.gain.value = 14; lfo.connect(lfoG);
    [0, 6].forEach(det => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(260, s);
      o.frequency.exponentialRampToValueAtTime(520, s + 0.18);
      o.frequency.setValueAtTime(520, s + 0.5);
      o.frequency.exponentialRampToValueAtTime(420, s + 0.85);
      lfoG.connect(o.frequency);
      o.connect(f); o.start(s); o.stop(s + 0.9);
    });
    lfo.start(s); lfo.stop(s + 0.9);
  }
  function hootSound(){
    if (!sfxOn || !ac) return;
    const t0 = ac.currentTime;
    [[0, 0.22, 440], [0.42, 0.45, 410]].forEach(([off, len, f0]) => {
      const s = t0 + off;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, s); o.frequency.linearRampToValueAtTime(f0 - 45, s + len);
      const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f0 * 0.5;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.3, s + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, s + len + 0.12);
      const g2 = ac.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(fxGain);
      o.start(s); o2.start(s); o.stop(s + len + 0.15); o2.stop(s + len + 0.15);
    });
  }
  function roarSound(){
    if (!sfxOn || !ac) return;
    const s = ac.currentTime;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(500, s); f.frequency.linearRampToValueAtTime(1500, s + 0.2); f.frequency.linearRampToValueAtTime(500, s + 0.7);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.35, s + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.75);
    const trem = ac.createOscillator(); trem.frequency.value = 22;
    const tremG = ac.createGain(); tremG.gain.value = 0.12; trem.connect(tremG); tremG.connect(g.gain);
    f.connect(g); g.connect(fxGain);
    [0, 11].forEach(det => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(190, s); o.frequency.linearRampToValueAtTime(260, s + 0.18);
      o.frequency.exponentialRampToValueAtTime(130, s + 0.75);
      o.connect(f); o.start(s); o.stop(s + 0.8);
    });
    trem.start(s); trem.stop(s + 0.8);
  }
  function popSound(){
    if (!sfxOn || !ac) return;
    const s = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, s); o.frequency.exponentialRampToValueAtTime(780, s + 0.5);
    const g = ac.createGain(); env(g, s, 0.1, 0.08, 0.6);
    o.connect(g); g.connect(fxGain); o.start(s); o.stop(s + 0.75);
  }
  
  // música: caixinha de música para o patinho, versão "tuba" para o elefante
  const mtof = m => 440 * Math.pow(2, (m - 69)/12);
  const MEL = [
    72,76,79,76, 77,76,74,null,
    74,77,81,77, 76,74,72,null,
    72,76,79,84, 81,79,77,76,
    74,76,74,71, 72,null,79,null,
    76,79,84,79, 81,79,76,null,
    77,81,79,77, 76,74,76,null,
    72,74,76,77, 79,81,79,76,
    74,71,74,76, 72,null,null,null
  ];
  const BASS = [48,55, 43,50, 53,48, 43,48, 48,55, 53,50, 48,53, 43,48];
  // canção de ninar (3/4), só para a noite
  const LULL = [
    79,null,76,null,72,null,  74,null,71,null,67,null,
    79,null,76,null,74,null,  72,null,null,null,null,null,
    77,null,72,null,69,null,  76,null,72,null,69,null,
    71,null,74,null,67,null,  72,null,null,null,null,null
  ];
  const LBASS = [48,43,48,48,53,45,43,48];
  const VOICES = {
    duck:     { bpm:112, oct:0,   wave:'sine',     bassWave:'triangle', bell:true },
    elephant: { bpm:92,  oct:-12, wave:'triangle', bassWave:'sine',     bell:false, pum:true },
    lion:     { bpm:126, oct:0,   wave:'triangle', bassWave:'triangle', bell:false, xylo:true },
    owl:      { bpm:84,  oct:0,   wave:'triangle', bassWave:'sine',     bell:true },
    night:    { bpm:62,  oct:0,   wave:'sine',     bassWave:'sine',     bell:true, arp:true, mel:LULL, bass:LBASS, bassEvery:6 }
  };
  let voice = VOICES.duck, step = 0, nextT = 0, musicTimer = null;
  let lastLevelT = 0;
  function setMusicVoice(n){ const v = st.night() ? VOICES.night : VOICES[n]; if (v !== voice){ voice = v; step = 0; } }
  function musicLevel(){ if (!st.night()) return 0.55; return 0.4 * Math.max(0, 1 - st.nightElapsed() / 900); }
  function note(m, s, dur, wave, vol, bell){
    const f = mtof(m);
    const g = ac.createGain(); env(g, s, vol, 0.008, dur);
    g.connect(musicGain);
    const o = ac.createOscillator(); o.type = wave; o.frequency.value = f; o.connect(g);
    o.start(s); o.stop(s + dur + 0.05);
    if (bell){
      const g2 = ac.createGain(); env(g2, s, vol*0.25, 0.005, dur*0.5); g2.connect(musicGain);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f*3; o2.connect(g2);
      o2.start(s); o2.stop(s + dur);
    }
  }
  function schedule(){
    if (ac.currentTime - lastLevelT > 1){
      lastLevelT = ac.currentTime;
      const lv = musicLevel();
      musicGain.gain.setTargetAtTime(lv, ac.currentTime, 0.8);
      if (st.night() && lv <= 0.001){ // fim do "timer de sono": a música para sozinha
        stopMusic(); musicOn = false; st.onAutoStop(); return;
      }
    }
    const eighth = 30 / voice.bpm;
    const mel = voice.mel || MEL, bass = voice.bass || BASS, every = voice.bassEvery || 4;
    const bassOff = voice.oct < 0 ? -12 : 0;
    while (nextT < ac.currentTime + 0.15){
      const m = mel[step % mel.length];
      if (m !== null){
        const dur = voice.arp ? 1.4 : voice.bell ? 0.7 : (voice.xylo ? 0.22 : 0.35);
        note(m + voice.oct, nextT, dur, voice.wave, voice.arp ? 0.17 : voice.bell ? 0.22 : 0.26, voice.bell);
      }
      if (voice.xylo){
        if (step % 2 === 1) drum(nextT, step % 4 === 3 ? 330 : 240, 0.16);
        if (step % 8 === 0) drum(nextT, 150, 0.22);
      }
      if (step % every === 0){
        const b = bass[Math.floor(step/every) % bass.length];
        note(b + bassOff, nextT, voice.arp ? 2 : voice.bell ? 0.9 : (voice.xylo ? 0.3 : 0.5), voice.bassWave, voice.arp ? 0.13 : 0.2, false);
      }
      if (voice.arp && (step % 6 === 2 || step % 6 === 4)){
        const b = bass[Math.floor(step/6) % bass.length];
        note(b + (step % 6 === 2 ? 19 : 24), nextT, 1.1, 'sine', 0.06, false);
      }
      if (voice.pum && step % 4 === 2){
        const b = bass[Math.floor(step/4) % bass.length] + 7 - 12;
        note(b, nextT, 0.25, 'sine', 0.14, false);
      }
      nextT += eighth; step++;
    }
  }
  function drum(s, f0, vol){
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0*0.55, s + 0.12);
    const g = ac.createGain(); env(g, s, vol, 0.004, 0.13);
    o.connect(g); g.connect(musicGain); o.start(s); o.stop(s + 0.18);
  }
  function startMusic(){
    if (!ac || musicTimer) return;
    nextT = ac.currentTime + 0.1;
    musicGain.gain.cancelScheduledValues(ac.currentTime);
    musicGain.gain.setTargetAtTime(musicLevel(), ac.currentTime, 0.4); lastLevelT = ac.currentTime;
    musicTimer = setInterval(schedule, 40);
  }
  function stopMusic(){
    if (!ac) return;
    musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    clearInterval(musicTimer); musicTimer = null;
  }
  function thud(){
    if (!sfxOn || !ac) return;
    const s = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, s); o.frequency.exponentialRampToValueAtTime(45, s + 0.25);
    const g = ac.createGain(); env(g, s, 0.5, 0.01, 0.28);
    o.connect(g); g.connect(fxGain); o.start(s); o.stop(s + 0.32);
  }

  return {
    start: startAudio,
    quack: quackSound, trumpet: trumpetSound, hoot: hootSound, roar: roarSound, pop: popSound, thud,
    setVoice: setMusicVoice,
    toggleMusic(){ musicOn = !musicOn; musicOn ? startMusic() : stopMusic(); return musicOn; },
    toggleSfx(){ sfxOn = !sfxOn; return sfxOn; },
    // chamada ao ligar/desligar a noite; devolve true se a música (re)começou
    onNight(v){
      if (!ac) return false;
      fxGain.gain.setTargetAtTime(v ? 0.5 : 1, ac.currentTime, 0.3);
      lastLevelT = 0;
      if (v && !musicTimer){ musicOn = true; startMusic(); return true; }
      return false;
    }
  };
}
