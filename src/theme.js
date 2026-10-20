// Fonts and board themes shared by every scene.
// Fonts are bundled via @fontsource (SIL Open Font License).
import "@fontsource/unifrakturmaguntia/400.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
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
 */
export const THEMES = [
  {
    id: "light",
    name: "Light page",
    description: "White paper, black ink. Calm and easy to read.",
    paper: 0xf4f2ec,
    ink: 0x111111,
    soft: 0x47433c,
    line: 0x111111,
    red: 0xc1121f,
    cards: {
      detective: { bg: 0xfbfaf6, ink: 0x111111, edge: 0x111111 },
      vigilante: { bg: 0x111111, ink: 0xf4f2ec, edge: 0x111111 },
    },
  },
  {
    id: "dark",
    name: "Dark page",
    description: "Black page, white ink. The red stands out more.",
    paper: 0x0d0d0d,
    ink: 0xf1efe9,
    soft: 0xc9c4ba,
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
    soft: 0x47433c,
    line: 0x111111,
    red: 0xc1121f,
    cards: {
      detective: { bg: 0xfbfaf6, ink: 0x111111, edge: 0x111111 },
      vigilante: { bg: 0x111111, ink: 0xf4f2ec, edge: 0xf1efe9 },
    },
    split: { at: 0.355, paper: 0x0d0d0d, ink: 0xf1efe9, soft: 0xc9c4ba, line: 0xf1efe9 },
  },
];

const STORAGE_KEY = "shadows-of-judgment.theme";

export function getTheme() {
  let id = null;
  try {
    id = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function setTheme(id) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not saved, but the choice still applies for this session via the registry.
  }
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
  return g;
}
