import Phaser from "phaser";
import { getTheme, paintBackground } from "../theme.js";
import { bodyText, displayText } from "../ui/widgets.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const theme = getTheme();
    paintBackground(this, theme);

    displayText(this, theme, 375, 280, "Shadows of\nJudgment", 104);
    bodyText(this, theme, 375, 428, "DETECTIVE · VS · VIGILANTE", 22, { soft: true });

    const tap = bodyText(this, theme, 375, 1000, "Tap to start", 30, { soft: true });
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    this.input.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
