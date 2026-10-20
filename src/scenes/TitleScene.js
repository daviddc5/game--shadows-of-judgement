import Phaser from "phaser";
import { FONTS } from "../theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Main title
    this.add
      .text(centerX, centerY, "SHADOWS OF\nJUDGMENT", {
        fontFamily: FONTS.display,
        fontSize: "80px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // "Tap to start" text
    const tapText = this.add
      .text(centerX, centerY + 250, "TAP TO START", {
        fontFamily: "Arial, sans-serif",
        fontSize: "36px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // Blinking animation for tap text
    this.tweens.add({
      targets: tapText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Make entire screen clickable to proceed
    this.input.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
