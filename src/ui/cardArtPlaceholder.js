// A drawn placeholder for card art: a small noir dusk scene (sky, moon,
// skyline, rain) with the card type's symbol on a seal. The scene is seeded by
// the card id, so each card looks different but always the same.
// Real art (a card's `art` image) replaces this; see CaseBattleScene.buildCardArt.
import { iconKey } from "./cardIcons.js";

const SKY_TOP = 0x4b505c;
const SKY_HORIZON = 0xa8a397;
const FAR_CITY = 0x5f626b;
const NEAR_CITY = 0x202127;
const WINDOW = 0xf6e7b4;
const MOON = 0xe9e4d8;
const SEAL = 0xf4f2ec;
const RED = 0xc1121f;

/** Small deterministic random generator seeded from a string. */
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws a row of buildings along the bottom of the box, with optional lit windows. */
function skyline(g, rng, left, right, bottom, minH, maxH, color, windows) {
  let x = left;
  while (x < right) {
    const w = Math.min(8 + Math.floor(rng() * 14), right - x);
    const h = minH + Math.floor(rng() * (maxH - minH));
    g.fillStyle(color, 1).fillRect(x, bottom - h, w, h);
    if (windows) {
      for (let wy = bottom - h + 4; wy < bottom - 4; wy += 6) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          if (rng() < 0.22) g.fillStyle(WINDOW, 1).fillRect(wx, wy, 2, 2);
        }
      }
    }
    x += w + (rng() < 0.3 ? 1 : 0);
  }
}

/** Diagonal rain streaks, each kept inside the box. */
function rain(g, rng, left, top, w, h, count, alpha) {
  g.lineStyle(1, 0xffffff, alpha);
  for (let i = 0; i < count; i++) {
    const x = left + rng() * w;
    const y = top + rng() * (h - 10);
    const len = 6 + rng() * 6;
    const x2 = Math.max(left, x - len * 0.35);
    g.lineBetween(x, y, x2, Math.min(top + h, y + len));
  }
}

/**
 * Returns the display objects for a placeholder centred at (0, y) inside a
 * card container, w × h in size. `side` decides the moon colour.
 */
export function buildPlaceholderArt(scene, card, side, y, w, h, edgeColor) {
  const rng = seeded(card.id);
  const left = -w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const g = scene.add.graphics();

  // Dusk sky: darker at the top, a pale glow along the horizon.
  g.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_HORIZON, SKY_HORIZON, 1).fillRect(left, top, w, h);

  // Type accents that sit behind the city.
  if (card.type === "POWER") {
    // Two searchlight beams sweeping up from the city.
    g.fillStyle(0xffffff, 0.16);
    g.fillTriangle(left + w * 0.3, bottom, left + w * 0.05, top, left + w * 0.22, top);
    g.fillTriangle(left + w * 0.7, bottom, left + w * 0.8, top, left + w * 0.97, top);
  }

  // Moon (none for an ambush: it happens in the dark). Vigilante cards get a red moon.
  if (card.type !== "AMBUSH") {
    const mx = left + 14 + rng() * (w - 28);
    const moonColor = side === "vigilante" ? RED : MOON;
    g.fillStyle(0xffffff, 0.12).fillCircle(mx, top + 16, 18);
    g.fillStyle(moonColor, 0.3).fillCircle(mx, top + 16, 12);
    g.fillStyle(moonColor, 1).fillCircle(mx, top + 16, 8);
  }

  // City: a far layer and a near layer with lit windows.
  skyline(g, rng, left, left + w, bottom, 18, 44, FAR_CITY, false);
  skyline(g, rng, left, left + w, bottom, 8, 30, NEAR_CITY, true);

  if (card.type === "BAIT") {
    // Low fog rolling through the streets.
    g.fillStyle(0xffffff, 0.22).fillRect(left, bottom - 18, w, 10);
    g.fillStyle(0xffffff, 0.12).fillRect(left, bottom - 26, w, 8);
  }
  if (card.type === "AMBUSH") {
    // Eyes watching from an alley.
    const ex = left + 18 + rng() * (w - 36);
    g.fillStyle(RED, 1).fillRect(ex, bottom - 12, 3, 2).fillRect(ex + 6, bottom - 12, 3, 2);
  }

  rain(g, rng, left, top, w, h, card.type === "QUICK" ? 34 : 16, card.type === "QUICK" ? 0.35 : 0.2);

  // The type symbol on a seal, so the card type still reads at a glance.
  const sealY = y - 2;
  const seal = scene.add.circle(0, sealY, 17, SEAL, 0.95).setStrokeStyle(2, NEAR_CITY);
  const icon = scene.add.image(0, sealY, iconKey(card.type)).setDisplaySize(19, 19).setTint(NEAR_CITY);

  const frame = scene.add.rectangle(0, y, w, h).setStrokeStyle(1, edgeColor, 0.6);
  return [g, seal, icon, frame];
}
