// Makes the battle sound effects in public/assets/audio/sfx/ from code: paper
// flicks, thumps and whooshes built from filtered noise. Needs ffmpeg.
//
//   node scripts/make-sfx.mjs            # all sounds
//   node scripts/make-sfx.mjs impact     # just one
//
// Tweak a sound's recipe below and run it again. Any file can also be replaced
// with a recorded sound of the same name.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 44100;
const OUT = new URL("../public/assets/audio/sfx/", import.meta.url).pathname;

// ---------------------------------------------------------------- building blocks

/** A seeded random generator, so every run makes the same sounds. */
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

function noise(seconds, seed) {
  const r = rng(seed);
  return buffer(seconds).map(() => r() * 2 - 1);
}

/** RBJ biquad filter; `freq` may be a function of time (seconds) for a sweep. */
function filter(input, type, freq, q = 0.707) {
  const out = new Float32Array(input.length);
  let b0, b1, b2, a1, a2;
  const update = (f) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    let n0, n1, n2;
    if (type === "lowpass") [n0, n1, n2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (type === "highpass") [n0, n1, n2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [n0, n1, n2] = [alpha, 0, -alpha]; // bandpass, 0 dB peak
    const a0 = 1 + alpha;
    [b0, b1, b2, a1, a2] = [n0 / a0, n1 / a0, n2 / a0, (-2 * cos) / a0, (1 - alpha) / a0];
  };
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    if (i % 32 === 0) update(typeof freq === "function" ? freq(i / SR) : freq);
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    out[i] = y;
  }
  return out;
}

/** Multiplies by an envelope given as a function of time (seconds). */
const shape = (input, env) => input.map((v, i) => v * env(i / SR));

/** Attack, then exponential decay with time constant `tau`. */
const hit = (attack, tau) => (t) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

/** A sine whose frequency is a function of time. */
function tone(seconds, freq) {
  let phase = 0;
  return buffer(seconds).map((_, i) => {
    phase += (2 * Math.PI * freq(i / SR)) / SR;
    return Math.sin(phase);
  });
}

/** Adds `part` into `into` at `at` seconds, scaled by `gain`. */
function mix(into, part, at = 0, gain = 1) {
  const start = Math.round(at * SR);
  for (let i = 0; i < part.length && start + i < into.length; i++) into[start + i] += part[i] * gain;
  return into;
}

/** A small room (Schroeder reverb), mixed in at `wet`. */
function room(input, wet, size = 1) {
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ d: Math.round(n * size), buf: null, i: 0 }));
  const allpasses = [225, 556].map((n) => ({ d: n, buf: null, i: 0 }));
  for (const c of [...combs, ...allpasses]) c.buf = new Float32Array(c.d);
  return input.map((x) => {
    let sum = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.buf[c.i] = x + y * 0.8;
      c.i = (c.i + 1) % c.d;
      sum += y;
    }
    let y = sum / combs.length;
    for (const a of allpasses) {
      const b = a.buf[a.i];
      a.buf[a.i] = y + b * 0.5;
      a.i = (a.i + 1) % a.d;
      y = b - y * 0.5;
    }
    return x * (1 - wet) + y * wet;
  });
}

const soften = (input, drive = 1.5) => input.map((v) => Math.tanh(v * drive) / Math.tanh(drive));

/** Fades the last `ms` to silence and scales the peak to -3 dB. */
function finish(input, ms = 30) {
  const fade = Math.round((ms / 1000) * SR);
  for (let i = 0; i < fade; i++) input[input.length - 1 - i] *= i / fade;
  const peak = input.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  return input.map((v) => (v / peak) * 0.708);
}

// ---------------------------------------------------------------- the sounds

const SOUNDS = {
  // Tapping a card in your hand: a soft, dry tick.
  select: () => {
    const out = buffer(0.08);
    mix(out, shape(filter(noise(0.08, 1), "bandpass", 2600, 1.2), hit(0.001, 0.006)));
    mix(out, shape(tone(0.08, () => 1400), hit(0.002, 0.012)), 0, 0.25);
    return finish(out, 10);
  },

  // A card slid onto the table: a paper swish, then a light tap as it lands.
  card: () => {
    const out = buffer(0.32);
    const swish = filter(noise(0.32, 2), "bandpass", (t) => 2200 + t * 6000, 0.8);
    mix(out, shape(swish, (t) => (t < 0.09 ? (t / 0.09) ** 2 : Math.exp(-(t - 0.09) / 0.035))));
    mix(out, shape(filter(noise(0.1, 3), "lowpass", 900), hit(0.001, 0.014)), 0.11, 0.9);
    return finish(room(out, 0.12, 0.6));
  },

  // Turning a card over: two quick flicks of the edge.
  flip: () => {
    const out = buffer(0.25);
    const flick = (seed) => shape(filter(noise(0.1, seed), "bandpass", 4200, 0.9), hit(0.002, 0.016));
    mix(out, flick(4), 0, 0.6);
    mix(out, flick(5), 0.055, 1);
    mix(out, shape(filter(noise(0.25, 6), "bandpass", 1500, 0.6), hit(0.03, 0.05)), 0, 0.25);
    return finish(room(out, 0.1, 0.6));
  },

  // The two cards rushing at each other.
  whoosh: () => {
    const len = 0.26;
    const out = filter(noise(len, 7), "bandpass", (t) => 500 + (t / len) * 2600, 1.1);
    return finish(shape(out, (t) => Math.sin(Math.PI * Math.min(1, t / len)) ** 2 * (t / len)), 15);
  },

  // The cards meet: a deep thump with a crack on top.
  impact: () => {
    const out = buffer(0.9);
    mix(out, shape(tone(0.9, (t) => 42 + 110 * Math.exp(-t / 0.035)), hit(0.002, 0.16)));
    mix(out, shape(filter(noise(0.3, 8), "bandpass", 420, 0.8), hit(0.001, 0.05)), 0, 0.7);
    mix(out, shape(filter(noise(0.1, 9), "highpass", 2500), hit(0.0005, 0.01)), 0, 0.5);
    return finish(room(soften(out, 2), 0.2));
  },

  // Locked together and grinding: a gritty scrape (stopped when the grind ends).
  grind: () => {
    const len = 1.0;
    const r = rng(10);
    const grit = noise(len, 11).map((v) => v * (r() < 0.04 ? 3 : 0.6));
    const out = filter(grit, "bandpass", (t) => 1700 + Math.sin(t * 38) * 500, 1.4);
    mix(out, shape(tone(len, (t) => 70 + Math.sin(t * 9) * 6), () => 0.25));
    return finish(shape(out, (t) => Math.min(1, t / 0.05)), 80);
  },

  // Breaking through: a heavier crunch.
  break: () => {
    const out = buffer(1.0);
    mix(out, shape(tone(1.0, (t) => 36 + 90 * Math.exp(-t / 0.05)), hit(0.002, 0.22)));
    const r = rng(12);
    for (let k = 0; k < 7; k++) {
      const crunch = shape(filter(noise(0.12, 20 + k), "bandpass", 800 + r() * 2500, 1.5), hit(0.001, 0.02));
      mix(out, crunch, k * 0.014 + r() * 0.01, 0.6);
    }
    return finish(room(soften(out, 2.2), 0.25));
  },

  // The cut-in band for a big play: a rising rush into a boom and a dark metal ring.
  sting: () => {
    const rise = 0.32;
    const out = buffer(1.8);
    const rush = filter(noise(rise, 13), "bandpass", (t) => 300 + (t / rise) ** 2 * 3500, 0.9);
    mix(out, shape(rush, (t) => (t / rise) ** 3));
    mix(out, shape(tone(1.8 - rise, (t) => 48 + 70 * Math.exp(-t / 0.06)), hit(0.003, 0.35)), rise, 1.1);
    mix(out, shape(filter(noise(0.4, 14), "lowpass", 600), hit(0.002, 0.08)), rise, 0.8);
    // Inharmonic partials, like a struck steel plate.
    [1, 2.76, 5.4, 8.93].forEach((ratio, k) => {
      mix(out, shape(tone(1.8 - rise, () => 196 * ratio), hit(0.002, 0.5 / (k + 1))), rise, 0.22 / (k + 1));
    });
    return finish(room(soften(out, 1.8), 0.32, 1.2), 120);
  },

  // A countered Power card: a sharp hit and glassy shards.
  cancel: () => {
    const out = buffer(0.8);
    mix(out, shape(tone(0.8, (t) => 60 + 120 * Math.exp(-t / 0.03)), hit(0.002, 0.09)), 0, 0.7);
    const r = rng(15);
    for (let k = 0; k < 26; k++) {
      const shard = shape(filter(noise(0.06, 30 + k), "bandpass", 3000 + r() * 6000, 12), hit(0.0005, 0.012));
      mix(out, shard, r() ** 1.6 * 0.3, 0.5 + r() * 0.5);
    }
    return finish(room(out, 0.22));
  },
};

// ---------------------------------------------------------------- output

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SOUNDS);
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `sfx-${process.pid}.wav`);
for (const name of names) {
  if (!SOUNDS[name]) throw new Error(`No sound called "${name}"`);
  writeFileSync(tmp, wav(SOUNDS[name]()));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "96k", join(OUT, `${name}.mp3`)]);
  console.log(`${name}.mp3`);
}
rmSync(tmp, { force: true });
