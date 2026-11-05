// Tiny synthesised camera sounds – no audio assets needed.

let audio: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function click(ctx: AudioContext, at: number, freq: number, gain: number, dur: number) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(at);
}

export function playShutter() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  click(ctx, t, 2400, 0.9, 0.04);
  click(ctx, t + 0.07, 1500, 0.7, 0.06);
}

export function playWind() {
  const ctx = ac();
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 7; i++) click(ctx, t + i * 0.07, 3200 + Math.random() * 600, 0.35, 0.015);
}
