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

  // A card dealt firmly onto a felt card table, like a poker game: a short
  // swish, then a soft, close "thup". The thup lands 0.05 s in.
  felt: () => {
    const out = buffer(0.35);
    const at = 0.05;
    mix(out, shape(filter(noise(at, 50), "bandpass", 2500, 0.8), (t) => (t / at) ** 2), 0, 0.3);
    mix(out, shape(filter(noise(0.15, 51), "lowpass", 1400), hit(0.0008, 0.022)), at, 1);
    mix(out, shape(tone(0.35, (t) => 160 * (1 + 0.6 * Math.exp(-t / 0.01))), hit(0.001, 0.03)), at, 0.5);
    return finish(room(out, 0.05, 0.4), 30);
  },

  // Cards revealed: a quick swipe into one deep drum hit.
  reveal: () => {
    const at = 0.12;
    const out = buffer(0.9);
    const swipe = filter(noise(at, 44), "bandpass", (t) => 700 + (t / at) * 2500, 0.7);
    mix(out, shape(swipe, (t) => (t / at) ** 2), 0, 0.5);
    mix(out, shape(tone(0.9 - at, (t) => 58 + 45 * Math.exp(-t / 0.03)), hit(0.002, 0.2)), at, 1);
    mix(out, shape(filter(noise(0.15, 45), "bandpass", 300, 0.9), hit(0.001, 0.04)), at, 0.6);
    return finish(room(soften(out, 1.8), 0.2), 100);
  },

  // Waiting banks energy: a soft rising charge that settles on a chime.
  charge: () => {
    const len = 0.45;
    const out = buffer(1.0);
    const glide = (t) => 220 * 2 ** (Math.min(t, len) / len * 2); // up two octaves
    mix(out, shape(tone(1.0, glide), (t) => (t < len ? (t / len) ** 1.5 : Math.exp(-(t - len) / 0.12))), 0, 0.5);
    mix(out, shape(tone(1.0, (t) => glide(t) * 1.5), (t) => (t < len ? (t / len) ** 2 : Math.exp(-(t - len) / 0.1))), 0, 0.2);
    mix(out, shape(filter(noise(len, 45), "bandpass", (t) => 800 + (t / len) * 4000, 3), (t) => (t / len) ** 2), 0, 0.25);
    [880, 1320, 1760].forEach((f, k) => mix(out, shape(tone(0.55, () => f), hit(0.002, 0.18)), len + k * 0.03, 0.25));
    return finish(room(out, 0.25), 120);
  },

  // The needle moving: a mechanical ratchet that slows as the needle settles
  // (the meter eases out the same way).
  needle: () => {
    const out = buffer(0.5);
    let t = 0;
    for (let k = 0; t < 0.4; k++) {
      mix(out, shape(filter(noise(0.03, 60 + k), "bandpass", 3200, 9), hit(0.0003, 0.004)), t, 0.8);
      mix(out, shape(filter(noise(0.03, 90 + k), "bandpass", 1100, 4), hit(0.0003, 0.006)), t, 0.4);
      t += 0.022 + k * 0.006;
    }
    return finish(room(out, 0.08, 0.4), 30);
  },

  // The verdict: one gavel strike on its block, in a big room.
  gavel: () => {
    const out = buffer(1.6);
    mix(out, shape(filter(noise(0.05, 61), "highpass", 1800), hit(0.0003, 0.004)), 0, 1);
    [
      [180, 0.1, 1],
      [420, 0.06, 0.7],
      [690, 0.045, 0.5],
      [1150, 0.03, 0.35],
    ].forEach(([f, tau, gain]) => mix(out, shape(tone(1.6, () => f), hit(0.001, tau)), 0, gain));
    mix(out, shape(filter(noise(0.2, 62), "lowpass", 700), hit(0.001, 0.03)), 0, 0.7);
    return finish(room(soften(out, 2), 0.38, 1.4), 200);
  },

  // Shaken: a heartbeat, lub-dub, lub-dub.
  shaken: () => {
    const out = buffer(1.3);
    const beat = (gain) => shape(tone(1.3, (t) => 48 + 30 * Math.exp(-t / 0.02)), hit(0.004, 0.07)).map((v) => v * gain);
    [[0, 1], [0.16, 0.7], [0.62, 1], [0.78, 0.7]].forEach(([at, g]) => {
      mix(out, beat(g), at);
      mix(out, shape(filter(noise(0.1, 63), "lowpass", 300), hit(0.003, 0.03)), at, 0.4 * g);
    });
    return finish(room(soften(out, 1.6), 0.1), 120);
  },

  // Cornered: a heavy door slams, then the lock clicks.
  cornered: () => {
    const out = buffer(1.0);
    mix(out, shape(tone(1.0, (t) => 62 + 50 * Math.exp(-t / 0.03)), hit(0.002, 0.14)), 0, 1);
    mix(out, shape(filter(noise(0.3, 64), "lowpass", 900), hit(0.001, 0.05)), 0, 0.9);
    mix(out, shape(filter(noise(0.05, 65), "highpass", 2000), hit(0.0003, 0.005)), 0, 0.4);
    // The bolt: a click and a short metal clack.
    mix(out, shape(filter(noise(0.05, 66), "bandpass", 2400, 10), hit(0.0003, 0.008)), 0.3, 0.7);
    mix(out, shape(filter(noise(0.05, 67), "bandpass", 1300, 6), hit(0.0003, 0.012)), 0.36, 0.8);
    return finish(room(soften(out, 2), 0.22, 0.9), 120);
  },

  // Heat: a police siren wailing a few streets away.
  heat: () => {
    const len = 1.8;
    const wail = (t) => 700 + 260 * Math.sin(2 * Math.PI * (t / 1.1) - Math.PI / 2);
    let out = tone(len, wail);
    out = out.map((v, i) => Math.tanh(v * 2.5) * 0.6); // a harder, horn-like edge
    out = filter(out, "lowpass", 1600);
    out = shape(out, (t) => Math.min(1, t / 0.25) * Math.min(1, (len - t) / 0.4));
    return finish(room(out, 0.5, 1.4), 100);
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
