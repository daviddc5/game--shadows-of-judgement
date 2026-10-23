import Phaser from "phaser";
import { getTheme, paintBackground } from "../theme.js";
import { bodyText, button, displayText } from "../ui/widgets.js";
import { isOn, onFlagsChange } from "../flags.js";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const theme = getTheme();
    paintBackground(this, theme);

    displayText(this, theme, 375, 230, "Shadows of\nJudgment", 88);

    button(this, theme, 375, 520, 520, "Campaign", () => this.scene.start("CampaignScene"), { primary: true });
    button(this, theme, 375, 630, 520, "Single player", () => {
      this.registry.set("debugMode", false);
      this.scene.start("SinglePlayerLobbyScene", { debugMode: false });
    });
    button(this, theme, 375, 740, 520, "Multiplayer", () => {
      this.registry.set("debugMode", false);
      this.scene.start("MultiplayerLobbyScene");
    });
    button(this, theme, 375, 850, 520, "Appearance", () => this.scene.start("AppearanceScene"));
    button(this, theme, 375, 960, 520, "How to play", () => this.scene.start("InstructionsScene"));

    // Redraw when a flag is flipped in Harness, so changes show without a reload.
    const stopListening = onFlagsChange(() => this.scene.restart());
    this.events.once("shutdown", stopListening);

    if (isOn("test_mode_enabled")) {
      button(this, theme, 375, 1080, 360, "Test mode", () => {
        this.registry.set("debugMode", true);
        this.scene.start("SinglePlayerLobbyScene", { debugMode: true });
      }, { h: 64, size: 30 });
    }

    bodyText(this, theme, 375, 1240, "Every case ends in a verdict.", 22, { soft: true });
  }
}
