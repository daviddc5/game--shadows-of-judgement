// Small themed building blocks shared by the menu scenes.
import { FONTS, hex, zone } from "../theme.js";

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

/** Serif body text; `soft` uses the muted ink. */
export function bodyText(scene, theme, x, y, text, size = 22, { soft = false, italic = false, align = "center", wrap, color } = {}) {
  const z = zone(theme, y);
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.body,
      fontSize: `${size}px`,
      fontStyle: italic ? "italic" : "normal",
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
  {
    character: "Independent Detective",
    side: "detective",
    name: "Detective",
    portrait: "detective-neutral",
    goal: "Push the Case to 100\nto capture the Vigilante.",
  },
  {
    character: "Vigilante",
    side: "vigilante",
    name: "Vigilante",
    portrait: "killer-neutral",
    goal: "Drag the Case down to 0\nto escape the Detective.",
  },
];

/**
 * Two side cards, styled like the battle cards: Detective on its card colour,
 * Vigilante on its own. Calls onSelect(character) and returns { select, setEnabled }.
 */
export function characterPicker(scene, theme, top, onSelect) {
  const entries = SIDES.map((s, i) => {
    const y = top + i * 230;
    const card = theme.cards[s.side];
    const bg = scene.add
      .rectangle(375, y, 640, 200, card.bg)
      .setStrokeStyle(2, card.edge)
      .setInteractive({ useHandCursor: true });
    const portrait = scene.add.image(160, y, s.portrait).setDisplaySize(150, 150);
    const frame = scene.add.rectangle(160, y, 154, 154).setStrokeStyle(2, card.ink);
    const name = scene.add
      .text(250, y - 40, s.name, { fontFamily: FONTS.body, fontSize: "44px", fontStyle: "600", color: hex(card.ink) })
      .setOrigin(0, 0.5);
    const goal = scene.add
      .text(252, y + 30, s.goal, {
        fontFamily: FONTS.body,
        fontSize: "22px",
        fontStyle: "italic",
        color: hex(card.ink),
        lineSpacing: 2,
      })
      .setOrigin(0, 0.5);
    bg.on("pointerdown", () => bg.input.enabled && onSelect(s.character));
    return { ...s, bg, card, parts: [portrait, frame, name, goal] };
  });

  return {
    select(character) {
      entries.forEach((e) => {
        const chosen = e.character === character;
        e.bg.setStrokeStyle(chosen ? 6 : 2, chosen ? theme.red : e.card.edge);
      });
    },
    setEnabled(enabled) {
      entries.forEach((e) => {
        e.bg.input.enabled = enabled;
      });
    },
  };
}
