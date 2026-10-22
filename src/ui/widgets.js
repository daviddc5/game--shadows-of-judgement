// Small themed building blocks shared by the menu scenes.
import { FONTS, hex, zone } from "../theme.js";
import { CHARACTERS, portraitKey } from "../case/characters.js";

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

/**
 * One panel per side, styled like that side's cards, with a row of its
 * characters (from src/case/characters.js). Tapping a portrait picks the side
 * and the character: onSelect(sideCharacterName, characterId).
 * Returns { select(sideCharacterName, characterId), setEnabled }.
 */
export function characterPicker(scene, theme, top, onSelect) {
  const tiles = [];
  SIDES.forEach((s, i) => {
    const y = top + i * 330;
    const card = theme.cards[s.side];
    if (card.outline != null) scene.add.rectangle(375, y, 666, 306, card.outline);
    scene.add.rectangle(375, y, 660, 300, card.bg).setStrokeStyle(3, card.edge);
    scene.add
      .text(70, y - 124, s.name, { fontFamily: FONTS.body, fontSize: "36px", fontStyle: "600", color: hex(card.ink) })
      .setOrigin(0, 0.5);
    scene.add
      .text(70, y - 90, s.goal, { fontFamily: FONTS.body, fontSize: "20px", color: hex(card.ink) })
      .setOrigin(0, 0.5);

    const list = CHARACTERS[s.side];
    list.forEach((c, j) => {
      const x = 375 + (j - (list.length - 1) / 2) * (TILE + 50);
      const ty = y + 30;
      scene.add.image(x, ty, portraitKey(c)).setDisplaySize(TILE, TILE);
      const frame = scene.add
        .rectangle(x, ty, TILE + 6, TILE + 6)
        .setStrokeStyle(2, card.ink)
        .setInteractive({ useHandCursor: true });
      scene.add
        .text(x, ty + TILE / 2 + 22, c.name, { fontFamily: FONTS.body, fontSize: "22px", fontStyle: "600", color: hex(card.ink) })
        .setOrigin(0.5);
      frame.on("pointerdown", () => frame.input.enabled && onSelect(s.character, c.id));
      tiles.push({ frame, card, character: s.character, id: c.id });
    });
  });

  return {
    select(character, id) {
      tiles.forEach((t) => {
        const chosen = t.character === character && t.id === id;
        t.frame.setStrokeStyle(chosen ? 6 : 2, chosen ? theme.red : t.card.ink);
      });
    },
    setEnabled(enabled) {
      tiles.forEach((t) => {
        t.frame.input.enabled = enabled;
      });
    },
  };
}
