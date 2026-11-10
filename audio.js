// Procedural Web Audio API Synthesizer + Kid-Friendly AI Robot Text-to-Speech Narrator
// Zero external dependencies - powers all block sounds, animal voices, disco party music, rocket thrusters & spoken AI coaching!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.voiceEnabled = true;
    this.discoInterval = null;
    this.discoStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopDiscoMusic();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
    return this.muted;
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else if (this.voiceEnabled) {
      this.speak('AI Robot Voice is ON!');
    }
    return this.voiceEnabled;
  }

  // Speaks out loud to a 5-6 year old in a friendly, cheerful AI Robot Companion voice!
  speak(text, { pitch = 1.22, rate = 1.04, interrupt = true } = {}) {
    if (this.muted || !this.voiceEnabled || !('speechSynthesis' in window)) return;
    // Strip emojis and excess punctuation so TTS reads cleanly
    const cleanText = String(text || '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[•|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return;

    try {
      if (interrupt) window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = 0.92;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // Ignore TTS errors on restricted browsers
    }
  }

  playTone(freq, type = 'triangle', duration = 0.1, volume = 0.14, slideTo = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playNoise(duration = 0.1, volume = 0.14, filterFreq = 1400) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  playPlace(blockId = 1) {
    const pitch = 240 + (blockId % 8) * 30;
    this.playTone(pitch, 'triangle', 0.075, 0.16, pitch * 1.25);
  }

  playBreak() {
    this.playNoise(0.09, 0.18, 1600);
    this.playTone(170, 'sine', 0.08, 0.12, 95);
  }

  playDoor(isOpen) {
    if (isOpen) {
      this.playTone(220, 'triangle', 0.12, 0.18, 370);
    } else {
      this.playTone(330, 'triangle', 0.12, 0.18, 160);
    }
  }

  playSleepChime(isMorning = false) {
    const notes = isMorning ? [392, 523.25, 659.25, 783.99] : [523.25, 392, 329.63, 261.63];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'sine', 0.2, 0.14), idx * 110);
    });
  }

  playUndo() {
    this.playTone(440, 'sine', 0.09, 0.15, 250);
  }

  playJump() {
    this.playTone(230, 'sine', 0.14, 0.14, 470);
  }

  playBounce() {
    this.playTone(190, 'sine', 0.32, 0.24, 820);
    setTimeout(() => this.playTone(540, 'triangle', 0.18, 0.16, 920), 65);
  }

  playBuildChime() {
    const notes = [330, 392, 523.25, 659.25];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.12, 0.12), idx * 55);
    });
  }

  playQuestFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'square', 0.16, 0.12), idx * 90);
    });
  }

  playCoin() {
    this.playTone(987.77, 'sine', 0.08, 0.14);
    setTimeout(() => this.playTone(1318.51, 'triangle', 0.22, 0.16), 65);
  }

  playUpgradeUnlock() {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'triangle', 0.14, 0.15), idx * 65);
    });
  }

  playLevelUpFanfare() {
    const melody = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 90 },
      { f: 783.99, d: 0.12, t: 180 },
      { f: 1046.5, d: 0.22, t: 270 },
      { f: 783.99, d: 0.12, t: 430 },
      { f: 1046.5, d: 0.38, t: 540 }
    ];
    melody.forEach((m) => {
      setTimeout(() => this.playTone(m.f, 'square', m.d, 0.15), m.t);
    });
  }

  playFuse() {
    this.playNoise(0.45, 0.16, 3200);
  }

  playExplosion() {
    this.playNoise(0.8, 0.42, 720);
    this.playTone(110, 'sawtooth', 0.6, 0.32, 30);
  }

  playRocketLaunch() {
    this.playNoise(1.6, 0.34, 950);
    this.playTone(95, 'sawtooth', 1.4, 0.2, 420);
  }

  playFirework() {
    this.playTone(380, 'sine', 0.2, 0.12, 980);
    setTimeout(() => {
      this.playNoise(0.25, 0.18, 2400);
    }, 180);
  }

  playAnimalSound(type = 'wolf') {
    if (type === 'wolf') {
      this.playTone(340, 'sawtooth', 0.09, 0.15, 480);
      setTimeout(() => this.playTone(460, 'sawtooth', 0.14, 0.15, 280), 100);
    } else if (type === 'pig') {
      this.playTone(185, 'sawtooth', 0.11, 0.14, 135);
      setTimeout(() => this.playTone(210, 'sawtooth', 0.13, 0.14, 150), 120);
    } else if (type === 'chicken') {
      this.playTone(620, 'triangle', 0.08, 0.14, 790);
      setTimeout(() => this.playTone(740, 'triangle', 0.1, 0.14, 520), 85);
    } else if (type === 'trex') {
      // Deep dinosaur roar!
      this.playNoise(0.55, 0.28, 650);
      this.playTone(135, 'sawtooth', 0.55, 0.26, 48);
    } else {
      // Friendly AI Robot bleep
      this.playTone(660, 'sine', 0.07, 0.12, 990);
      setTimeout(() => this.playTone(990, 'triangle', 0.09, 0.12, 740), 75);
    }
  }

  toggleDiscoMusic() {
    if (this.discoInterval) {
      this.stopDiscoMusic();
      return false;
    }
    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 698.46];
    const bass = [130.81, 130.81, 164.81, 196.0, 146.83, 146.83, 174.61, 196.0];
    this.discoStep = 0;
    this.discoInterval = setInterval(() => {
      if (this.muted) return;
      const idx = this.discoStep % melody.length;
      this.playTone(melody[idx], 'square', 0.13, 0.07);
      this.playTone(bass[idx], 'triangle', 0.16, 0.11);
      if (this.discoStep % 2 === 0) {
        this.playNoise(0.04, 0.06, 3800);
      }
      this.discoStep++;
    }, 220);
    return true;
  }

  stopDiscoMusic() {
    if (this.discoInterval) {
      clearInterval(this.discoInterval);
      this.discoInterval = null;
    }
  }
}

window.soundEngine = new SoundEngine();
