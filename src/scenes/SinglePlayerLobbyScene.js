import Phaser from "phaser";
import { getTheme, paintBackground } from "../theme.js";
import { backLink, bodyText, button, characterPicker, displayText } from "../ui/widgets.js";

export default class SinglePlayerLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "SinglePlayerLobbyScene" });
    this.selectedCharacter = null;
    this.debugMode = false;
  }

  init(data) {
    this.debugMode = import.meta.env.DEV && !!data?.debugMode;
    this.selectedCharacter = null;
  }

  create() {
    const theme = getTheme();
    paintBackground(this, theme);
    backLink(this, theme, () => this.scene.start("MenuScene"));

    displayText(this, theme, 375, 190, "Single Player", 80);
    bodyText(this, theme, 375, 280, this.debugMode ? "Test mode: extra controls in battle" : "Choose your side", 26, {
      italic: true,
      soft: true,
    });

    this.picker = characterPicker(this, theme, 600, (character) => this.selectCharacter(character));
    this.startButton = button(this, theme, 375, 1010, 520, "Take the case", () => {
      if (!this.selectedCharacter) return;
      this.registry.set("playerCharacter", this.selectedCharacter);
      this.scene.start("CaseBattleScene");
    }, { primary: true });
    this.startButton.setEnabled(false);
  }

  selectCharacter(character) {
    this.selectedCharacter = character;
    this.picker.select(character);
    this.startButton.setEnabled(true);
  }
}
