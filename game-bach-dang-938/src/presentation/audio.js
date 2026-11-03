// Procedural Web Audio API sound synthesis for Bach Dang 938.
// Fully offline, zero external dependencies, zero bandwidth, $0 cost.

class ProceduralSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // 1. Tiếng Trống Trận Dồn Dập (War Drums)
  playWarDrum() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [0, 0.12, 0.28].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const startFreq = idx === 0 ? 115 : (idx === 1 ? 95 : 82);
      osc.frequency.setValueAtTime(startFreq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(32, t + offset + 0.35);

      gain.gain.setValueAtTime(idx === 2 ? 0.85 : 0.6, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.36);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.38);
    });
  }

  // 2. Tiếng Tù Và Khởi Binh (War Horn / Tu Va)
  playHorn() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(146.83, t); // D3
    osc.frequency.linearRampToValueAtTime(220.00, t + 0.3); // A3
    osc.frequency.setValueAtTime(220.00, t + 0.8);
    osc.frequency.exponentialRampToValueAtTime(110.00, t + 1.2);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.2);
    gain.gain.setValueAtTime(0.45, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(1200, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.3);
  }

  // 3. Tiếng Bắn Mưa Tên & Xé Gió (Arrow Volley)
  playArrowVolley() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.06;
      // Bow string pluck
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + i * 25, t + delay);
      osc.frequency.exponentialRampToValueAtTime(120, t + delay + 0.12);
      gain.gain.setValueAtTime(0.35, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.15);

      // Arrow flight whoosh
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.sin((j / bufferSize) * Math.PI);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700 + i * 150, t + delay + 0.03);
      filter.frequency.exponentialRampToValueAtTime(2200, t + delay + 0.2);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.25, t + delay + 0.03);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.24);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(t + delay + 0.03);
    }
  }

  // 4. Tiếng Tên Lửa Vút Bay & Cháy (Fire Arrow)
  playFireArrow() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    this.playArrowVolley();
    const t = this.ctx.currentTime;
    const dur = 0.45;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.linearRampToValueAtTime(450, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // 5. Tiếng Thuyền Đâm Bãi Cọc & Vỡ Gỗ (Stake Impact & Hull Damage)
  playStakeImpact() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Deep heavy impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);

    // Splintering wood crack
    const dur = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t + 0.02);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.5, t + 0.02);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);
    noise.start(t + 0.02);
  }

  // 6. Tiếng Nổ Bè Lửa & Khói (Fire Raft Explosion)
  playExplosion() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const dur = 0.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // 7. Tiếng Kèn Khải Hoàn Chiến Thắng (Victory Fanfare)
  playVictoryFanfare() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Fanfare notes: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.4, t + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + (idx === 3 ? 0.7 : 0.22));

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, t + delay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + (idx === 3 ? 0.75 : 0.25));
    });
  }
}

export const SoundEngine = new ProceduralSoundEngine();

