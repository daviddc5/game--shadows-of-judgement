import Phaser from "phaser";
import { FONTS, THEMES, getTheme, hex, paintBackground, setTheme, zone } from "../theme.js";
import { backLink, bodyText, displayText } from "../ui/widgets.js";

const PREVIEW_W = 200;
const PREVIEW_H = 340;
const PER_ROW = 3;

/** Lets the player pick a board theme. Every entry in THEMES appears here. */
export default class AppearanceScene extends Phaser.Scene {
  constructor() {
    super({ key: "AppearanceScene" });
  }

  create() {
    const theme = getTheme();
    paintBackground(this, theme);
    backLink(this, theme, () => this.scene.start("MenuScene"));

    displayText(this, theme, 375, 190, "Appearance", 80);
    bodyText(this, theme, 375, 280, "Choose how the case looks", 26, { italic: true, soft: true });

    THEMES.forEach((t, i) => {
      const col = i % PER_ROW;
      const row = Math.floor(i / PER_ROW);
      const x = 375 + (col - (PER_ROW - 1) / 2) * (PREVIEW_W + 30);
      const y = 640 + row * (PREVIEW_H + 190);
      this.drawTile(t, x, y, t.id === theme.id);
    });
  }

  drawTile(t, x, y, selected) {
    const current = getTheme();
    const left = x - PREVIEW_W / 2;
    const top = y - PREVIEW_H / 2;
    const g = this.add.graphics();

    // Page, with the dark top band for split themes.
    g.fillStyle(t.paper, 1).fillRect(left, top, PREVIEW_W, PREVIEW_H);
    let topInk = t.ink;
    if (t.split) {
      g.fillStyle(t.split.paper, 1).fillRect(left, top, PREVIEW_W, PREVIEW_H * t.split.at);
      topInk = t.split.ink;
    }

    // Opponent row, meter and needle.
    g.fillStyle(topInk, 1).fillRect(left + 14, top + 18, 26, 26);
    g.fillStyle(topInk, 0.6).fillRect(left + 48, top + 24, 70, 6).fillRect(left + 48, top + 36, 50, 5);
    g.lineStyle(2, topInk, 1).strokeRect(left + 14, top + 90, PREVIEW_W - 28, 8);
    g.fillStyle(topInk, 1).fillRect(left + PREVIEW_W / 2, top + 90, 22, 8);
    g.fillStyle(t.red, 1).fillRect(left + PREVIEW_W / 2 + 22, top + 82, 3, 24);

    // The two cards in the arena.
    const cardW = 66;
    const cardH = 92;
    const cy = top + 150;
    const vig = t.cards.vigilante;
    const det = t.cards.detective;
    g.fillStyle(vig.bg, 1).fillRect(x - cardW - 6, cy, cardW, cardH);
    g.lineStyle(1, vig.edge, 1).strokeRect(x - cardW - 6, cy, cardW, cardH);
    g.fillStyle(det.bg, 1).fillRect(x + 6, cy, cardW, cardH);
    g.lineStyle(1, det.edge, 1).strokeRect(x + 6, cy, cardW, cardH);
    this.add.text(x - cardW / 2 - 6, cy + cardH / 2, "33", { fontFamily: FONTS.body, fontSize: "30px", fontStyle: "600", color: hex(t.red) }).setOrigin(0.5);
    this.add.text(x + cardW / 2 + 6, cy + cardH / 2, "54", { fontFamily: FONTS.body, fontSize: "30px", fontStyle: "600", color: hex(det.ink) }).setOrigin(0.5);

    // Your hand.
    for (let i = 0; i < 4; i++) {
      g.fillStyle(det.bg, 1).fillRect(left + 18 + i * 42, top + 268, 36, 50);
      g.lineStyle(1, det.edge, 1).strokeRect(left + 18 + i * 42, top + 268, 36, 50);
    }

    // Frame: red when selected.
    const frame = this.add
      .rectangle(x, y, PREVIEW_W + 12, PREVIEW_H + 12)
      .setStrokeStyle(selected ? 6 : 2, selected ? current.red : current.line)
      .setInteractive({ useHandCursor: true });
    frame.on("pointerdown", () => {
      setTheme(t.id);
      this.scene.restart();
    });

    bodyText(this, current, x, y + PREVIEW_H / 2 + 46, t.name, 28, { color: hex(zone(current, y + PREVIEW_H / 2 + 46).ink) }).setFontStyle("600");
    bodyText(this, current, x, y + PREVIEW_H / 2 + 104, t.description, 19, { soft: true, wrap: PREVIEW_W + 20 });
    if (selected) bodyText(this, current, x, y - PREVIEW_H / 2 - 30, "Selected", 20, { italic: true, color: hex(current.red) });
  }
}
