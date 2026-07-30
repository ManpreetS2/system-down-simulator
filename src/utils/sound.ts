/**
 * Tiny WebAudio synth for UI feedback. No audio assets, no dependencies.
 * All sounds are short envelope-shaped oscillator blips.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getContext(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  volume: number,
): void {
  const audio = getContext();
  if (!audio) return;
  const t0 = audio.currentTime + startOffset;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  click(): void {
    tone(660, 0, 0.07, 'triangle', 0.08);
  },
  alert(): void {
    tone(520, 0, 0.16, 'square', 0.05);
    tone(392, 0.18, 0.2, 'square', 0.05);
  },
  success(): void {
    tone(523, 0, 0.1, 'triangle', 0.09);
    tone(659, 0.09, 0.1, 'triangle', 0.09);
    tone(784, 0.18, 0.16, 'triangle', 0.09);
  },
  partial(): void {
    tone(494, 0, 0.12, 'triangle', 0.08);
    tone(523, 0.12, 0.14, 'triangle', 0.08);
  },
  failure(): void {
    tone(311, 0, 0.14, 'sawtooth', 0.06);
    tone(233, 0.14, 0.22, 'sawtooth', 0.06);
  },
  achievement(): void {
    tone(660, 0, 0.09, 'sine', 0.09);
    tone(880, 0.09, 0.09, 'sine', 0.09);
    tone(1109, 0.18, 0.2, 'sine', 0.09);
  },
  gameOver(): void {
    tone(349, 0, 0.18, 'sawtooth', 0.06);
    tone(294, 0.2, 0.18, 'sawtooth', 0.06);
    tone(220, 0.4, 0.32, 'sawtooth', 0.06);
  },
};
