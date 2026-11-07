/** Sons synthétisés avec WebAudio : aucun fichier, aucune requête. */
type SoundName = 'enter' | 'stamp' | 'success' | 'gentle' | 'tap' | 'door' | 'publish';

let context: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  peak: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const at = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

const SOUNDS: Record<SoundName, [number, number, number, OscillatorType, number][]> = {
  enter: [
    [392, 0, 0.16, 'triangle', 0.12],
    [523, 0.09, 0.2, 'triangle', 0.12],
  ],
  stamp: [
    [130, 0, 0.12, 'sine', 0.3],
    [660, 0.03, 0.1, 'triangle', 0.06],
  ],
  success: [
    [523, 0, 0.14, 'triangle', 0.14],
    [659, 0.11, 0.14, 'triangle', 0.14],
    [784, 0.22, 0.28, 'triangle', 0.14],
  ],
  gentle: [[330, 0, 0.22, 'sine', 0.09]],
  tap: [[600, 0, 0.05, 'sine', 0.05]],
  door: [
    [180, 0, 0.1, 'triangle', 0.14],
    [240, 0.08, 0.16, 'triangle', 0.1],
  ],
  publish: [
    [392, 0, 0.14, 'triangle', 0.14],
    [523, 0.12, 0.14, 'triangle', 0.14],
    [659, 0.24, 0.14, 'triangle', 0.14],
    [784, 0.36, 0.34, 'triangle', 0.16],
  ],
};

export function playSound(name: SoundName): void {
  if (muted || typeof AudioContext === 'undefined') return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    for (const [frequency, start, duration, type, peak] of SOUNDS[name]) {
      tone(context, frequency, start, duration, type, peak);
    }
  } catch (error) {
    console.warn('Son indisponible', error);
  }
}
