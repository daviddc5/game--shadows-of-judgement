// A drawn placeholder for card art: a small noir scene per card type, with the
// type's symbol on a seal in the corner. Each type has its own scene so cards
// tell apart at a glance; the details are seeded by the card id, so two cards
// of the same type differ a little but always look the same.
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

/** Draws a row of buildings along `bottom`, with optional lit windows. */
function skyline(g, rng, left, right, bottom, minH, maxH, color, windows) {
  let x = left;
  while (x < right) {
    const w = Math.min(8 + Math.floor(rng() * 14), right - x);
    const h = minH + Math.floor(rng() * (maxH - minH));
    g.fillStyle(color, 1).fillRect(x, bottom - h, w, h);
    if (windows) litWindows(g, rng, x, bottom - h, w, h, 0.22);
    x += w + (rng() < 0.3 ? 1 : 0);
  }
}

function litWindows(g, rng, x, y, w, h, chance) {
  for (let wy = y + 4; wy < y + h - 4; wy += 6) {
    for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      if (rng() < chance) g.fillStyle(WINDOW, 1).fillRect(wx, wy, 2, 2);
    }
  }
}

/** Diagonal rain streaks, each kept inside the box. */
function rain(g, rng, box, count, alpha) {
  g.lineStyle(1, 0xffffff, alpha);
  for (let i = 0; i < count; i++) {
    const x = box.left + rng() * box.w;
    const y = box.top + rng() * (box.h - 10);
    const len = 6 + rng() * 6;
    const x2 = Math.max(box.left, x - len * 0.35);
    g.lineBetween(x, y, x2, Math.min(box.bottom, y + len));
  }
}

function sky(g, box, top, horizon) {
  g.fillGradientStyle(top, top, horizon, horizon, 1).fillRect(box.left, box.top, box.w, box.h);
}

function moon(g, x, y, color) {
  g.fillStyle(0xffffff, 0.12).fillCircle(x, y, 18);
  g.fillStyle(color, 0.3).fillCircle(x, y, 12);
  g.fillStyle(color, 1).fillCircle(x, y, 8);
}

/** QUICK: a lightning storm over the city. */
function storm(g, rng, box) {
  const { left, top, bottom, w } = box;
  sky(g, box, 0x2f333d, 0x737680);
  g.fillStyle(0xffffff, 0.08).fillRect(left, top, w, box.h);
  // The bolt, with a soft glow behind it.
  const pts = [];
  let x = left + w * (0.3 + rng() * 0.25);
  for (let y = top; y < bottom - 24; y += 9) {
    pts.push({ x, y });
    x += (rng() - 0.5) * 16;
  }
  g.lineStyle(6, 0xffffff, 0.2).strokePoints(pts);
  g.lineStyle(2, 0xffffff, 1).strokePoints(pts);
  skyline(g, rng, left, left + w, bottom, 14, 34, 0x4a4d55, false);
  skyline(g, rng, left, left + w, bottom, 6, 22, NEAR_CITY, true);
  rain(g, rng, box, 44, 0.4);
}

/** NORMAL: rooftops at dusk with a water tower. */
function rooftops(g, rng, box, moonColor) {
  const { left, bottom, w } = box;
  sky(g, box, SKY_TOP, SKY_HORIZON);
  moon(g, left + w * (0.35 + rng() * 0.3), box.top + 18, moonColor);
  skyline(g, rng, left, left + w, bottom - 12, 12, 34, FAR_CITY, true);
  // Roof in the foreground, with a water tower and chimneys.
  g.fillStyle(NEAR_CITY, 1).fillRect(left, bottom - 14, w, 14);
  const tx = left + 14 + rng() * 20;
  g.fillRect(tx + 2, bottom - 24, 2, 10).fillRect(tx + 16, bottom - 24, 2, 10);
  g.fillRect(tx, bottom - 40, 20, 16);
  g.fillTriangle(tx - 2, bottom - 40, tx + 22, bottom - 40, tx + 10, bottom - 48);
  for (let i = 0; i < 3; i++) g.fillRect(left + w * 0.55 + i * 16 + rng() * 6, bottom - 20, 5, 6);
  rain(g, rng, box, 14, 0.2);
}

/** POWER: one tower over the city, searchlights sweeping the sky. */
function tower(g, rng, box) {
  const { left, top, bottom, w } = box;
  sky(g, box, 0x5a5f6b, 0xd0cabb);
  g.fillStyle(0xffffff, 0.22);
  g.fillTriangle(-6, bottom - 50, left + w * 0.02, top, left + w * 0.2, top);
  g.fillTriangle(6, bottom - 50, left + w * 0.62, top, left + w * 0.78, top);
  skyline(g, rng, left, left + w, bottom, 10, 30, FAR_CITY, true);
  // The tower: stepped top and a spire.
  g.fillStyle(NEAR_CITY, 1);
  g.fillRect(-12, bottom - 58, 24, 58).fillRect(-8, bottom - 64, 16, 6);
  g.fillTriangle(-3, bottom - 64, 3, bottom - 64, 0, top + 2);
  litWindows(g, rng, -12, bottom - 58, 24, 58, 0.45);
  skyline(g, rng, left, left + w * 0.3, bottom, 6, 18, NEAR_CITY, true);
  skyline(g, rng, left + w * 0.7, left + w, bottom, 6, 18, NEAR_CITY, true);
}

/** COUNTER: a figure waiting under a streetlamp against a brick wall. */
function streetlamp(g, rng, box, accent) {
  const { left, top, bottom, w, h } = box;
  const road = bottom - 14;
  g.fillStyle(0x6a6760, 1).fillRect(left, top, w, h);
  g.lineStyle(1, 0x55524c, 1);
  for (let y = top + 6, row = 0; y < road; y += 6, row++) {
    g.lineBetween(left, y, left + w, y);
    for (let x = left + (row % 2) * 6; x < left + w; x += 12) g.lineBetween(x, y - 6, x, y);
  }
  // A lit window and a door on the wall.
  const wx = left + w * (0.5 + rng() * 0.15);
  g.fillStyle(WINDOW, 1).fillRect(wx, top + 22, 14, 12);
  g.fillStyle(NEAR_CITY, 1).fillRect(wx, top + 27, 14, 1).fillRect(wx + 6, top + 22, 1, 12);
  g.fillStyle(0x2c2c30, 1).fillRect(wx + 24, road - 26, 16, 26);
  // Road with a wet sheen.
  g.fillStyle(0x26272c, 1).fillRect(left, road, w, 14);
  g.fillStyle(0xffffff, 0.15).fillRect(left, road + 6, w, 1);
  // Lamp, light cone, and the figure under it.
  const lx = left + w * 0.28;
  g.fillStyle(0xffffff, 0.2).fillTriangle(lx, top + 12, lx - 22, road, lx + 22, road);
  g.fillStyle(0xffffff, 0.3).fillEllipse(lx, road + 3, 50, 7);
  g.fillStyle(NEAR_CITY, 1).fillRect(lx - 13, top + 8, 2, road - top - 8).fillRect(lx - 13, top + 8, 13, 2);
  g.fillStyle(WINDOW, 1).fillCircle(lx, top + 11, 3);
  g.fillStyle(NEAR_CITY, 1).fillCircle(lx + 4, road - 19, 3).fillRect(lx + 1, road - 16, 7, 16);
  g.fillRect(lx - 1, road - 22, 11, 2); // hat brim
  if (accent) g.fillStyle(accent, 1).fillRect(lx + 1, road - 13, 7, 2);
}

/** BAIT: a lantern left on a foggy pier, the city across the water. */
function harbour(g, rng, box, moonColor) {
  const { left, top, bottom, w } = box;
  const shore = bottom - 26;
  sky(g, box, 0x6f737c, 0xd2cdc1);
  const mx = left + w * (0.15 + rng() * 0.3);
  moon(g, mx, top + 16, moonColor);
  skyline(g, rng, left, left + w, shore, 4, 16, 0x8a8c92, false);
  g.fillStyle(0x3a3d45, 1).fillRect(left, shore, w, bottom - shore);
  g.fillStyle(moonColor, 0.5);
  for (let y = shore + 3; y < bottom; y += 4) g.fillRect(mx - 4 + rng() * 4, y, 4 + rng() * 6, 1);
  g.fillStyle(0xffffff, 0.25);
  for (let i = 0; i < 10; i++) g.fillRect(left + rng() * w, shore + 2 + rng() * 22, 6 + rng() * 10, 1);
  // Pier on the right, with the lantern at its end.
  const px = left + w * 0.55;
  g.fillStyle(NEAR_CITY, 1).fillRect(px, shore + 6, left + w - px, 4);
  for (let x = px + 2; x < left + w; x += 12) g.fillRect(x, shore + 10, 2, bottom - shore - 10);
  g.fillStyle(WINDOW, 0.3).fillCircle(px + 6, shore + 1, 8);
  g.fillStyle(WINDOW, 1).fillRect(px + 4, shore - 1, 4, 6);
  // Fog.
  g.fillStyle(0xffffff, 0.25).fillRect(left, shore - 6, w, 8);
  g.fillStyle(0xffffff, 0.14).fillRect(left, shore + 12, w, 6);
}

/** AMBUSH: a narrow alley, and eyes at the end of it. */
function alley(g, rng, box) {
  const { left, top, bottom, w } = box;
  const right = left + w;
  const far = bottom - 22;
  // Light at the far end of the alley.
  g.fillGradientStyle(0x6b6e76, 0x6b6e76, 0xb8b3a6, 0xb8b3a6, 1).fillRect(-16, top, 32, far - top);
  g.fillStyle(0x1c1d22, 1).fillPoints([{ x: left, y: bottom }, { x: -16, y: far }, { x: 16, y: far }, { x: right, y: bottom }], true);
  g.fillStyle(0x3d3e45, 1).fillPoints([{ x: left, y: top }, { x: -16, y: top }, { x: -16, y: far }, { x: left, y: bottom }], true);
  g.fillStyle(0x4a4b52, 1).fillPoints([{ x: right, y: top }, { x: 16, y: top }, { x: 16, y: far }, { x: right, y: bottom }], true);
  // Windows on the walls, a fire escape, a dumpster.
  for (let i = 0; i < 4; i++) {
    const lit = rng() < 0.5 ? WINDOW : 0x2a2b30;
    g.fillStyle(lit, 1).fillRect(left + 8 + i * 13, top + 8 + i * 4, 5, 7);
  }
  g.lineStyle(1, 0x202127, 1);
  for (let y = top + 28; y < far; y += 14) {
    g.lineBetween(right - 40, y, right - 8, y + 2);
    g.lineBetween(right - 36, y, right - 14, y + 12);
  }
  g.fillStyle(NEAR_CITY, 1).fillRect(left + 14, bottom - 16, 26, 12);
  g.fillStyle(0x34353a, 1).fillRect(left + 12, bottom - 18, 30, 3);
  // Someone waiting.
  g.fillStyle(NEAR_CITY, 1).fillCircle(0, far - 16, 3).fillRect(-4, far - 13, 8, 13);
  g.fillStyle(RED, 1).fillRect(-2, far - 17, 1.5, 1.5).fillRect(1, far - 17, 1.5, 1.5);
}

/**
 * Returns the display objects for a placeholder centred at (0, y) inside a
 * card container, w × h in size. `side` decides the moon colour.
 */
export function buildPlaceholderArt(scene, card, side, y, w, h, edgeColor) {
  const rng = seeded(card.id);
  const box = { left: -w / 2, top: y - h / 2, bottom: y + h / 2, w, h };
  const vigilante = side === "vigilante";
  const moonColor = vigilante ? RED : MOON;
  const g = scene.add.graphics();

  switch (card.type) {
    case "QUICK": storm(g, rng, box); break;
    case "POWER": tower(g, rng, box); break;
    case "COUNTER": streetlamp(g, rng, box, vigilante ? RED : null); break;
    case "BAIT": harbour(g, rng, box, moonColor); break;
    case "AMBUSH": alley(g, rng, box); break;
    default: rooftops(g, rng, box, moonColor);
  }

  // The type symbol on a small seal in the corner, so the scene stays visible.
  const sx = box.left + w - 13;
  const sy = box.top + 13;
  const seal = scene.add.circle(sx, sy, 10, SEAL, 0.95).setStrokeStyle(1.5, NEAR_CITY);
  const icon = scene.add.image(sx, sy, iconKey(card.type)).setDisplaySize(12, 12).setTint(NEAR_CITY);

  const frame = scene.add.rectangle(0, y, w, h).setStrokeStyle(1, edgeColor, 0.6);
  return [g, seal, icon, frame];
}
