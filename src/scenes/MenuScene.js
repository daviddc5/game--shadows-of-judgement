import Phaser from "phaser";
import { FONTS } from "../theme.js";
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const centerX = this.cameras.main.width / 2;

    // Title
    this.add
      .text(centerX, 200, "SHADOWS OF\nJUDGMENT", {
        fontFamily: FONTS.display,
        fontSize: "72px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // Multiplayer button
    const multiplayerButton = this.add
      .text(centerX, 450, "🌐 MULTIPLAYER", {
        fontFamily: FONTS.display,
        fontSize: "48px",
        color: "#ffffff",
        padding: { x: 60, y: 20 },
        backgroundColor: "#0066cc",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Single Player button
    const singlePlayerButton = this.add
      .text(centerX, 580, "🎮 SINGLE PLAYER", {
        fontFamily: FONTS.display,
        fontSize: "48px",
        color: "#ffffff",
        padding: { x: 60, y: 20 },
        backgroundColor: "#006600",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    if (import.meta.env.DEV) {
      // Test Mode button
      const testModeButton = this.add
        .text(centerX, 675, "🧪 TEST MODE", {
          fontFamily: FONTS.display,
          fontSize: "42px",
          color: "#ffffff",
          padding: { x: 55, y: 18 },
          backgroundColor: "#7a3f00",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      testModeButton.on("pointerover", () =>
        testModeButton.setBackgroundColor("#a95500"),
      );
      testModeButton.on("pointerout", () =>
        testModeButton.setBackgroundColor("#7a3f00"),
      );
      testModeButton.on("pointerdown", () => {
        this.registry.set("debugMode", true);
        this.scene.start("SinglePlayerLobbyScene", { debugMode: true });
      });
    }

    // How to Play button
    const howToPlayButton = this.add
      .text(centerX, 790, "❓ HOW TO PLAY", {
        fontFamily: FONTS.display,
        fontSize: "36px",
        color: "#aaaaaa",
        padding: { x: 40, y: 15 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Multiplayer hover
    multiplayerButton.on("pointerover", () =>
      multiplayerButton.setBackgroundColor("#0088ff"),
    );
    multiplayerButton.on("pointerout", () =>
      multiplayerButton.setBackgroundColor("#0066cc"),
    );
    multiplayerButton.on("pointerdown", () => {
      this.registry.set("debugMode", false);
      this.scene.start("MultiplayerLobbyScene");
    });

    // Single Player hover
    singlePlayerButton.on("pointerover", () =>
      singlePlayerButton.setBackgroundColor("#009900"),
    );
    singlePlayerButton.on("pointerout", () =>
      singlePlayerButton.setBackgroundColor("#006600"),
    );
    singlePlayerButton.on("pointerdown", () => {
      this.registry.set("debugMode", false);
      this.scene.start("SinglePlayerLobbyScene", { debugMode: false });
    });

    // How to Play hover
    howToPlayButton.on("pointerover", () =>
      howToPlayButton.setColor("#ffffff"),
    );
    howToPlayButton.on("pointerout", () => howToPlayButton.setColor("#aaaaaa"));
    howToPlayButton.on("pointerdown", () => {
      this.scene.start("InstructionsScene");
    });
  }
}
