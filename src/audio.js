// Background music for the battle screen, with a mute setting that is saved
// on the device. The track is the owner's duel theme ("The Winning Hand"),
// public/assets/audio/duel-theme.mp3.
export const DUEL_THEME = "duel-theme";
const STORAGE_KEY = "shadows-of-judgment.music-muted";
const VOLUME = 0.5;

export function isMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Mutes or unmutes all game audio and remembers the choice. */
export function setMuted(scene, muted) {
  scene.sound.mute = muted;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Not saved, but the choice still applies for this session.
  }
  return muted;
}

/**
 * Starts the duel theme if it isn't already playing (a rematch keeps it
 * going). Browsers only allow sound after a tap, so if audio is still locked
 * the music starts as soon as it unlocks.
 */
export function playDuelMusic(scene) {
  scene.sound.mute = isMuted();
  if (!scene.cache.audio.exists(DUEL_THEME)) return;
  let music = scene.sound.get(DUEL_THEME);
  if (music?.isPlaying) return;
  music = music ?? scene.sound.add(DUEL_THEME, { loop: true, volume: VOLUME });
  if (scene.sound.locked) scene.sound.once("unlocked", () => music.play());
  else music.play();
}

export function stopMusic(scene) {
  scene.sound.get(DUEL_THEME)?.stop();
}

/**
 * Sound effects in public/assets/audio/sfx/, made by scripts/make-sfx.mjs (or
 * replaced by recordings with the same names), and how loud each plays.
 */
export const SFX = {
  select: 0.35,
  felt: 0.9,
  flip: 0.7,
  reveal: 0.55,
  charge: 0.5,
  whoosh: 0.5,
  impact: 0.85,
  grind: 0.35,
  break: 0.8,
  sting: 0.7,
  cancel: 0.75,
  needle: 0.3,
  gavel: 0.85,
  shaken: 0.8,
  cornered: 0.75,
  heat: 0.45,
  paparazzi: 0.7,
};

export const sfxKey = (name) => `sfx-${name}`;

/** Plays a sound effect; returns it (for one you need to stop, like the grind). */
export function playSfx(scene, name, { detune = 0, seek = 0 } = {}) {
  const key = sfxKey(name);
  if (scene.skipping) return null; // a skipped turn plays fast and quiet
  if (scene.sound.locked || !scene.cache.audio.exists(key)) return null;
  const sound = scene.sound.add(key, { volume: SFX[name], detune });
  sound.once("complete", () => sound.destroy());
  sound.play({ seek });
  return sound;
}
