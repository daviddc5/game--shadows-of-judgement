// One simple line symbol per card type, drawn once as a white 64×64 texture
// and tinted wherever it is used. Keys: "type-icon-POWER", "type-icon-COUNTER", …
//   POWER crown · COUNTER shield · BAIT mask · AMBUSH dagger · QUICK bolt · NORMAL ink drop

const SIZE = 64;

const DRAW = {
  POWER(g) {
    g.fillPoints(
      [
        { x: 6, y: 50 }, { x: 6, y: 16 }, { x: 20, y: 32 }, { x: 32, y: 8 },
        { x: 44, y: 32 }, { x: 58, y: 16 }, { x: 58, y: 50 },
      ],
      true,
    );
    g.fillRect(6, 53, 52, 6);
  },
  COUNTER(g) {
    g.fillPoints(
      [
        { x: 32, y: 4 }, { x: 58, y: 12 }, { x: 56, y: 34 },
        { x: 32, y: 60 }, { x: 8, y: 34 }, { x: 6, y: 12 },
      ],
      true,
    );
  },
  BAIT(g) {
    g.lineStyle(6, 0xffffff, 1).strokeEllipse(32, 28, 54, 30);
    g.fillEllipse(20, 28, 13, 8).fillEllipse(44, 28, 13, 8);
    g.lineStyle(5, 0xffffff, 1).lineBetween(52, 40, 60, 62);
  },
  AMBUSH(g) {
    g.fillTriangle(32, 2, 40, 40, 24, 40);
    g.fillRect(14, 40, 36, 6);
    g.fillRect(28, 46, 8, 11);
    g.fillCircle(32, 60, 4);
  },
  QUICK(g) {
    g.fillPoints(
      [
        { x: 38, y: 2 }, { x: 12, y: 36 }, { x: 30, y: 36 }, { x: 24, y: 62 },
        { x: 52, y: 26 }, { x: 34, y: 26 }, { x: 44, y: 2 },
      ],
      true,
    );
  },
  NORMAL(g) {
    g.fillCircle(32, 42, 17);
    g.fillTriangle(32, 4, 16, 36, 48, 36);
  },
};

export function iconKey(type) {
  return `type-icon-${type}`;
}

/** Creates the icon textures if they don't exist yet. Safe to call from any scene. */
export function ensureTypeIcons(scene) {
  for (const [type, draw] of Object.entries(DRAW)) {
    const key = iconKey(type);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    draw(g);
    g.generateTexture(key, SIZE, SIZE);
    g.destroy();
  }
}
