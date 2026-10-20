import Phaser from "phaser";
import { getTheme, hex, paintBackground, zone } from "../theme.js";
import { backLink, bodyText, button, characterPicker, displayText } from "../ui/widgets.js";
import NetworkManager from "../network/NetworkManager.js";
import { getCharacter } from "../case/characters.js";

export default class MultiplayerLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "MultiplayerLobbyScene" });
    this.selectedCharacter = null;
    this.isSearching = false;
  }

  create() {
    this.theme = getTheme();
    this.selectedCharacter = null;
    this.isSearching = false;
    const theme = this.theme;
    paintBackground(this, theme);
    backLink(this, theme, () => {
      if (this.isSearching) return;
      NetworkManager.disconnect();
      this.scene.start("MenuScene");
    });

    displayText(this, theme, 375, 190, "Multiplayer", 80);
    this.statusText = bodyText(this, theme, 375, 280, "Connecting to the server...", 26, { soft: true });

    this.picker = characterPicker(this, theme, 560, (character, id) => this.selectCharacter(character, id));
    this.findMatchButton = button(this, theme, 375, 1195, 520, "Find an opponent", () => this.startMatchmaking(), {
      primary: true,
    });
    this.findMatchButton.setEnabled(false);
    this.searchingText = bodyText(this, theme, 375, 1195, "Searching for an opponent...", 30, {}).setVisible(
      false,
    );

    this.events.once("shutdown", () => this.shutdown());
    this.connectToServer();
  }

  setStatus(text, isError = false) {
    if (!this.sys.isActive() || !this.statusText) return;
    const z = zone(this.theme, 280);
    this.statusText.setText(text);
    this.statusText.setColor(hex(isError ? z.red : z.soft));
  }

  connectToServer() {
    NetworkManager.connect();

    NetworkManager.onMatchFound = (data) => {
      this.isSearching = false;
      // The server may assign the other side if both players picked the same one.
      // If the server switched our side, the chosen character falls back to that side's default.
      this.registry.set("playerCharacter", data.side === "vigilante" ? "Vigilante" : "Independent Detective");
      this.registry.set("playerCharacterId", this.selectedCharacterId);
      this.scene.start("CaseBattleScene", { online: data });
    };

    NetworkManager.onConnectionError = () => this.setStatus("Can't reach the server. Try again later.", true);

    this.time.delayedCall(1000, () => {
      if (NetworkManager.connected) this.setStatus("Connected. Choose your side.");
      else this.setStatus("Can't reach the server. Try again later.", true);
      this.updateFindButton();
    });
  }

  /** character is the side ("Independent Detective" / "Vigilante"); id picks who within it. */
  selectCharacter(character, id) {
    if (this.isSearching) return;
    const side = character === "Vigilante" ? "vigilante" : "detective";
    this.selectedCharacter = character;
    this.selectedCharacterId = getCharacter(side, id).id;
    this.picker.select(character, this.selectedCharacterId);
    this.updateFindButton();
  }

  updateFindButton() {
    this.findMatchButton.setEnabled(!!this.selectedCharacter && NetworkManager.connected);
  }

  startMatchmaking() {
    if (!this.selectedCharacter || !NetworkManager.connected) return;
    this.isSearching = true;
    this.findMatchButton.setVisible(false);
    this.searchingText.setVisible(true);
    this.picker.setEnabled(false);
    NetworkManager.findMatch(this.selectedCharacter, this.selectedCharacterId);
    this.tweens.add({ targets: this.searchingText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
  }

  shutdown() {
    // The battle scene installs its own callbacks.
    NetworkManager.onMatchFound = null;
    NetworkManager.onConnectionError = null;
  }
}
