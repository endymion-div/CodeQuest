class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    delaySec = 0,
    gainVal = 0.08
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playSuccess() {
    this.playTone(523.25, 0.14, 'triangle', 0, 0.07);
    this.playTone(659.25, 0.18, 'triangle', 0.08, 0.08);
  }

  playError() {
    this.playTone(220, 0.16, 'sawtooth', 0, 0.045);
    this.playTone(185, 0.2, 'sawtooth', 0.09, 0.04);
  }

  playLevelUp() {
    this.playTone(440, 0.14, 'triangle', 0, 0.07);
    this.playTone(554.37, 0.14, 'triangle', 0.09, 0.07);
    this.playTone(659.25, 0.16, 'triangle', 0.18, 0.08);
    this.playTone(880, 0.32, 'sine', 0.28, 0.09);
  }

  playBossDefeated() {
    this.playTone(392, 0.16, 'triangle', 0, 0.08);
    this.playTone(493.88, 0.16, 'triangle', 0.1, 0.08);
    this.playTone(587.33, 0.16, 'triangle', 0.2, 0.08);
    this.playTone(783.99, 0.36, 'triangle', 0.3, 0.1);
  }

  playAchievement() {
    this.playTone(659.25, 0.12, 'sine', 0, 0.07);
    this.playTone(987.77, 0.25, 'sine', 0.09, 0.08);
  }
}

export const soundEngine = new SoundEngine();
