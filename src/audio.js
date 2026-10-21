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
