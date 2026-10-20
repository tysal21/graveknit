// A low bell when a boss is ready (optional, off by default).
let ctx: AudioContext | null = null;

export function bossReadyCue() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx || new AC();
    const o = ctx.createOscillator(), gain = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 196;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);
    o.connect(gain);
    gain.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 2.3);
  } catch {
    /* no sound available */
  }
}
