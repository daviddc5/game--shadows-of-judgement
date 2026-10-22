// Small themed building blocks shared by the menu scenes.
import { FONTS, hex, zone } from "../theme.js";
import { CHARACTERS, portraitKey } from "../case/characters.js";
import { buildRubberStamp, paintFrame, paintPhotoMat } from "./cardFace.js";

/** Shrinks a text object until it fits `maxW` × `maxH` (or reaches `min` px). */
export function fit(text, maxW, maxH, min) {
  let size = parseInt(text.style.fontSize, 10);
  while ((text.width > maxW || text.height > maxH) && size > min) text.setFontSize(--size);
  return text;
}

/** Blackletter text in the theme's ink for its position on screen. */
export function displayText(scene, theme, x, y, text, size = 48, { color, align = "center" } = {}) {
  const z = zone(theme, y);
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.display,
      fontSize: `${size}px`,
      color: color ?? hex(z.ink),
      align,
    })
    .setOrigin(0.5);
}

/** Upright serif body text; `soft` uses the muted ink. */
export function bodyText(scene, theme, x, y, text, size = 22, { soft = false, align = "center", wrap, color } = {}) {
  const z = zone(theme, y);
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.body,
      fontSize: `${size}px`,
      color: color ?? hex(soft ? z.soft : z.ink),
      align,
      wordWrap: wrap ? { width: wrap } : undefined,
      lineSpacing: 4,
    })
    .setOrigin(0.5);
}

/**
 * A rectangular button. Primary buttons are filled with ink; others are outlined.
 * Returns { bg, text, setEnabled, setLabel, setVisible }.
 */
export function button(scene, theme, x, y, w, label, onClick, { primary = false, h = 84, size = 36 } = {}) {
  const z = zone(theme, y);
  const bg = scene.add
    .rectangle(x, y, w, h, primary ? z.ink : z.paper, primary ? 1 : 0)
    .setStrokeStyle(2, z.line)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y, label, {
      fontFamily: FONTS.body,
      fontSize: `${size}px`,
      fontStyle: "600",
      color: hex(primary ? z.paper : z.ink),
    })
    .setOrigin(0.5);
  bg.on("pointerover", () => bg.input.enabled && bg.setStrokeStyle(4, z.red));
  bg.on("pointerout", () => bg.setStrokeStyle(2, z.line));
  bg.on("pointerdown", () => {
    if (!bg.input.enabled) return;
    scene.tweens.add({ targets: [bg, text], scale: 0.96, duration: 60, yoyo: true });
    onClick();
  });
  return {
    bg,
    text,
    setEnabled(enabled) {
      bg.input.enabled = enabled;
      bg.setAlpha(enabled ? 1 : 0.35);
      text.setAlpha(enabled ? 1 : 0.45);
    },
    setLabel(t) {
      text.setText(t);
    },
    setVisible(v) {
      bg.setVisible(v);
      text.setVisible(v);
    },
    setDepth(d) {
      bg.setDepth(d);
      text.setDepth(d + 1);
    },
  };
}

/** "← Back" in the top-left corner. */
export function backLink(scene, theme, onClick, label = "← Back") {
  const z = zone(theme, 70);
  const t = scene.add
    .text(40, 70, label, { fontFamily: FONTS.body, fontSize: "28px", fontStyle: "600", color: hex(z.soft) })
    .setOrigin(0, 0.5)
    .setInteractive({ useHandCursor: true });
  t.on("pointerover", () => t.setColor(hex(z.ink)));
  t.on("pointerout", () => t.setColor(hex(z.soft)));
  t.on("pointerdown", onClick);
  return t;
}

const SIDES = [
  { character: "Independent Detective", side: "detective", name: "Detective", goal: "Push the Case to 100 to capture the Vigilante." },
  { character: "Vigilante", side: "vigilante", name: "Vigilante", goal: "Drag the Case down to 0 to escape the Detective." },
];

const TILE = 150;
const PANEL = { w: 660, h: 340, gap: 360 };

/**
 * One case-file panel per side, styled like that side's cards, with its
 * characters as evidence photos (from src/case/characters.js). Tapping a photo
 * picks the side and the character: onSelect(sideCharacterName, characterId).
 * The chosen one gets a red border and a "Chosen" stamp.
 * Returns { select(sideCharacterName, characterId), setEnabled }.
 */
export function characterPicker(scene, theme, top, onSelect) {
  const tiles = [];
  const panels = [];
  SIDES.forEach((s, i) => {
    const y = top + i * PANEL.gap;
    const card = theme.cards[s.side];
    const ink = hex(card.ink);
    const frame = scene.add.graphics().setPosition(375, y);
    paintFrame(frame, PANEL.w, PANEL.h, card, theme.red, false, 18);
    panels.push({ frame, card, character: s.character });
    const left = 375 - PANEL.w / 2 + 36;
    scene.add
      .text(left, y - 136, s.name, { fontFamily: FONTS.body, fontSize: "36px", fontStyle: "600", color: ink })
      .setOrigin(0, 0.5);
    const goal = scene.add
      .text(left, y - 110, s.goal, { fontFamily: FONTS.body, fontSize: "24px", color: ink, wordWrap: { width: PANEL.w - 72 } })
      .setOrigin(0, 0);
    fit(goal, PANEL.w - 72, 64, 18);

    const list = CHARACTERS[s.side];
    list.forEach((c, j) => {
      const x = 375 + (j - (list.length - 1) / 2) * (TILE + 60);
      const ty = y + 38;
      const mat = scene.add.graphics();
      paintPhotoMat(mat, x, ty, TILE + 16, TILE + 16, 16);
      scene.add.image(x, ty, portraitKey(c)).setDisplaySize(TILE, TILE);
      const hit = scene.add.rectangle(x, ty, TILE + 16, TILE + 16, 0xffffff, 0).setInteractive({ useHandCursor: true });
      scene.add
        .text(x, ty + TILE / 2 + 32, c.name, { fontFamily: FONTS.body, fontSize: "24px", fontStyle: "600", color: ink })
        .setOrigin(0.5);
      const chosen = buildRubberStamp(scene, x + TILE / 2 - 18, ty - TILE / 2 + 8, "Chosen", 20).setVisible(false);
      hit.on("pointerdown", () => hit.input.enabled && onSelect(s.character, c.id));
      tiles.push({ hit, chosen, character: s.character, id: c.id });
    });
  });

  return {
    select(character, id) {
      panels.forEach((p) => paintFrame(p.frame, PANEL.w, PANEL.h, p.card, theme.red, p.character === character, 18));
      tiles.forEach((t) => t.chosen.setVisible(t.character === character && t.id === id));
    },
    setEnabled(enabled) {
      tiles.forEach((t) => {
        t.hit.input.enabled = enabled;
      });
    },
  };
}
