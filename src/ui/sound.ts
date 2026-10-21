// Small optional sound cues (off by default): a low bell when a boss is ready, a bright chime for a Rare.
let ctx: AudioContext | null = null;

/** one soft sine note that fades out */
function tone(freq: number, secs: number, vol: number, delay = 0) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx || new AC();
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), gain = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + secs);
    o.connect(gain);
    gain.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + secs + 0.1);
  } catch {
    /* no sound available */
  }
}

export function bossReadyCue() {
  tone(196, 2.2, 0.25);
}

/** two rising notes, so a Rare is noticeable from across the room */
export function rareDropCue() {
  tone(659, 0.6, 0.15);
  tone(988, 0.9, 0.15, 0.12);
}
