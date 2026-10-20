import Phaser from "phaser";
import { getTheme, paintBackground } from "../theme.js";
import { backLink, bodyText, button, characterPicker, displayText } from "../ui/widgets.js";
import { getCharacter } from "../case/characters.js";

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
    bodyText(this, theme, 375, 280, this.debugMode ? "Test mode: extra controls in battle" : "Choose your side and character", 26, { soft: true });

    this.picker = characterPicker(this, theme, 560, (character, id) => this.selectCharacter(character, id));
    this.startButton = button(this, theme, 375, 1195, 520, "Take the case", () => {
      if (!this.selectedCharacter) return;
      this.registry.set("playerCharacter", this.selectedCharacter);
      this.registry.set("playerCharacterId", this.selectedCharacterId);
      this.scene.start("CaseBattleScene");
    }, { primary: true });
    this.startButton.setEnabled(false);
  }

  /** character is the side ("Independent Detective" / "Vigilante"); id picks who within it. */
  selectCharacter(character, id) {
    const side = character === "Vigilante" ? "vigilante" : "detective";
    this.selectedCharacter = character;
    this.selectedCharacterId = getCharacter(side, id).id;
    this.picker.select(character, this.selectedCharacterId);
    this.startButton.setEnabled(true);
  }
}
