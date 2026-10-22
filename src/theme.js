// Fonts and board themes shared by every scene.
// Fonts are bundled via @fontsource (SIL Open Font License).
import "@fontsource/unifrakturmaguntia/400.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/600.css";

// Blackletter is decoration only: the logo, screen titles, "The Case" and big
// moments ("Countered!", "Case Closed"). Anything a player needs to read
// (card names and numbers, buttons, character names, rules) uses EB Garamond.
export const FONTS = {
  display: "UnifrakturMaguntia, 'Times New Roman', serif",
  body: "'EB Garamond', Georgia, serif",
};

/**
 * Board themes the player can pick on the Appearance screen.
 * To add one, append an entry: colours are numbers (Phaser shapes); use hex()
 * for text. `split` (optional) gives the top part of the screen its own
 * paper/ink, down to `split.at` (fraction of the screen height).
 * Red is kept rare: the needle, the Vigilante's numbers and your selection.
 * Card styles: `edge` is the card's border; `outline` (optional) is a thin
 * line drawn just outside it, so a light border still shows on a light page.
 */
export const THEMES = [
  {
    id: "light",
    name: "Light page",
    description: "White paper, black ink. Calm and easy to read.",
    paper: 0xf4f2ec,
    ink: 0x111111,
    soft: 0x2f2c27,
    line: 0x111111,
    red: 0xc1121f,
    cards: {
      detective: { bg: 0xfbfaf6, ink: 0x111111, edge: 0x111111 },
      vigilante: { bg: 0x111111, ink: 0xf4f2ec, edge: 0xf4f2ec, outline: 0x111111 },
    },
  },
  {
    id: "dark",
    name: "Dark page",
    description: "Black page, white ink. The red stands out more.",
    paper: 0x0d0d0d,
    ink: 0xf1efe9,
    soft: 0xe2ded6,
    line: 0xf1efe9,
    red: 0xe0353f,
    cards: {
      detective: { bg: 0xf1efe9, ink: 0x111111, edge: 0xf1efe9 },
      vigilante: { bg: 0x1b1b1b, ink: 0xf1efe9, edge: 0xf1efe9 },
    },
  },
  {
    id: "split",
    name: "Split",
    description: "Your opponent's half in ink, yours on paper.",
    paper: 0xf4f2ec,
    ink: 0x111111,
    soft: 0x2f2c27,
    line: 0x111111,
    red: 0xc1121f,
    cards: {
      detective: { bg: 0xfbfaf6, ink: 0x111111, edge: 0x111111 },
      vigilante: { bg: 0x111111, ink: 0xf4f2ec, edge: 0xf4f2ec, outline: 0x111111 },
    },
    split: { at: 0.355, paper: 0x0d0d0d, ink: 0xf1efe9, soft: 0xe2ded6, line: 0xf1efe9 },
  },
];

const STORAGE_KEY = "shadows-of-judgment.theme";
const TEXT_SIZE_KEY = "shadows-of-judgment.text-size";
const CONTRAST_KEY = "shadows-of-judgment.contrast";

function load(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Storage can be blocked (private mode); fall back to the default.
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not saved; the choice is lost on reload.
  }
}

export function getTheme() {
  const id = load(STORAGE_KEY);
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  return getContrast() === "high" ? highContrast(theme) : theme;
}

export function setTheme(id) {
  save(STORAGE_KEY, id);
}

// ---------------------------------------------------------------- accessibility

/**
 * Text sizes on the Appearance screen. The scale applies to every piece of
 * reading text (EB Garamond); blackletter is decoration and keeps its size.
 */
export const TEXT_SIZES = [
  { id: "standard", name: "Standard", scale: 1 },
  { id: "large", name: "Large", scale: 1.15 },
  { id: "larger", name: "Larger", scale: 1.3 },
];

export const CONTRASTS = [
  { id: "standard", name: "Standard" },
  { id: "high", name: "High" },
];

export function getTextSize() {
  const id = load(TEXT_SIZE_KEY);
  return TEXT_SIZES.find((s) => s.id === id) ?? TEXT_SIZES[0];
}

export function setTextSize(id) {
  save(TEXT_SIZE_KEY, id);
}

export function getContrast() {
  return load(CONTRAST_KEY) === "high" ? "high" : "standard";
}

export function setContrast(id) {
  save(CONTRAST_KEY, id);
}

/**
 * High contrast: every near-black becomes black and every near-white becomes
 * white (muted ink included), so text and borders stand out fully. Red stays.
 */
function highContrast(theme) {
  const push = (n) => {
    const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    if (lum < 0.3) return 0x000000;
    if (lum > 0.7) return 0xffffff;
    return n;
  };
  const map = (obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, typeof v === "number" && k !== "at" && k !== "red" ? push(v) : v]),
    );
  return {
    ...map(theme),
    highContrast: true,
    cards: { detective: map(theme.cards.detective), vigilante: map(theme.cards.vigilante) },
    split: theme.split && map(theme.split),
  };
}

/**
 * Makes every EB Garamond text the game creates follow the chosen text size.
 * Call once, before the game starts.
 */
export function installTextScale(Phaser) {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const makeText = factory.text;
  factory.text = function (x, y, text, style) {
    const { scale } = getTextSize();
    const px = style && parseFloat(style.fontSize);
    if (scale !== 1 && px && style.fontFamily === FONTS.body) {
      style = { ...style, fontSize: `${Math.round(px * scale)}px` };
    }
    return makeText.call(this, x, y, text, style);
  };
}

/** The colours that apply at a given y position (the top of a split theme differs). */
export function zone(theme, y, height = 1334) {
  return theme.split && y < theme.split.at * height ? { ...theme, ...theme.split } : theme;
}

export const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

/** Paints the scene background for a theme (two bands for a split theme). */
export function paintBackground(scene, theme, width = 750, height = 1334) {
  const g = scene.add.graphics().setDepth(-10);
  g.fillStyle(theme.paper, 1).fillRect(0, 0, width, height);
  if (theme.split) {
    g.fillStyle(theme.split.paper, 1).fillRect(0, 0, width, theme.split.at * height);
  }
  scene.cameras.main.setBackgroundColor(theme.paper);
  paintPage(theme);
  return g;
}

/**
 * Colours the web page around the game to match the board, so the space left
 * above and below it on tall phone screens doesn't show as dark bars. Also
 * tints the mobile browser's address bar.
 */
function paintPage(theme) {
  if (typeof document === "undefined") return;
  const top = hex(theme.split ? theme.split.paper : theme.paper);
  const bottom = hex(theme.paper);
  document.documentElement.style.background = `linear-gradient(${top} 50%, ${bottom} 50%)`;
  document.body.style.background = "transparent";
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = top;
}
