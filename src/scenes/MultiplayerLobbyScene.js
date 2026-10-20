import Phaser from "phaser";
import NetworkManager from "../network/NetworkManager.js";

export default class MultiplayerLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "MultiplayerLobbyScene" });
    this.selectedCharacter = null;
    this.isSearching = false;
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Title
    this.add
      .text(centerX, 150, "MULTIPLAYER", {
        fontFamily: "DeathNote",
        fontSize: "72px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // Connection status
    this.statusText = this.add
      .text(centerX, 250, "Connecting to server...", {
        fontFamily: "DeathNote",
        fontSize: "28px",
        color: "#ffaa00",
      })
      .setOrigin(0.5);

    // Character selection title
    this.add
      .text(centerX, 310, "Choose Your Character", {
        fontFamily: "DeathNote",
        fontSize: "40px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    // === DETECTIVE OPTION ===
    this.detectiveBg = this.add
      .rectangle(centerX, 460, 600, 200, 0x333333, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x555555);

    this.detectivePortrait = this.add
      .image(centerX - 210, 460, "detective-neutral")
      .setDisplaySize(140, 140)
      .setOrigin(0.5);

    this.detectiveLabel = this.add
      .text(centerX + 30, 430, "Independent Detective", {
        fontFamily: "DeathNote",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.detectiveDesc = this.add
      .text(
        centerX + 30,
        475,
        "Push the Case to 100\nto capture the Vigilante.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#aaaaaa",
          align: "center",
          lineSpacing: 2,
        },
      )
      .setOrigin(0.5, 0);

    // === VIGILANTE OPTION ===
    this.vigilanteBg = this.add
      .rectangle(centerX, 700, 600, 200, 0x333333, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x555555);

    this.vigilantePortrait = this.add
      .image(centerX - 210, 700, "killer-neutral")
      .setDisplaySize(140, 140)
      .setOrigin(0.5);

    this.vigilanteLabel = this.add
      .text(centerX + 30, 670, "Vigilante", {
        fontFamily: "DeathNote",
        fontSize: "44px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.vigilanteDesc = this.add
      .text(
        centerX + 30,
        715,
        "Drag the Case down to 0\nto escape the Detective.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#aaaaaa",
          align: "center",
          lineSpacing: 2,
        },
      )
      .setOrigin(0.5, 0);

    // Find Match button (initially hidden)
    this.findMatchButton = this.add
      .text(centerX, 900, "FIND MATCH", {
        fontFamily: "DeathNote",
        fontSize: "56px",
        color: "#ffffff",
        padding: { x: 80, y: 30 },
        backgroundColor: "#00aa00",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    // Searching text (initially hidden)
    this.searchingText = this.add
      .text(centerX, 900, "SEARCHING FOR OPPONENT...", {
        fontFamily: "DeathNote",
        fontSize: "48px",
        color: "#ffaa00",
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Back button
    this.backButton = this.add
      .text(100, 80, "← BACK", {
        fontFamily: "DeathNote",
        fontSize: "36px",
        color: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    this.setupButtons();
    this.connectToServer();
  }

  setupButtons() {
    // Detective card
    this.detectiveBg.on("pointerover", () => {
      if (
        !this.isSearching &&
        this.selectedCharacter !== "Independent Detective"
      ) {
        this.detectiveBg.setFillStyle(0x1a3a5c);
        this.detectiveBg.setStrokeStyle(3, 0x00aaff);
      }
    });
    this.detectiveBg.on("pointerout", () => {
      if (this.selectedCharacter !== "Independent Detective") {
        this.detectiveBg.setFillStyle(0x333333);
        this.detectiveBg.setStrokeStyle(3, 0x555555);
      }
    });
    this.detectiveBg.on("pointerdown", () => {
      if (!this.isSearching) {
        this.selectCharacter("Independent Detective");
      }
    });

    // Vigilante card
    this.vigilanteBg.on("pointerover", () => {
      if (!this.isSearching && this.selectedCharacter !== "Vigilante") {
        this.vigilanteBg.setFillStyle(0x5c1a1a);
        this.vigilanteBg.setStrokeStyle(3, 0xff4444);
      }
    });
    this.vigilanteBg.on("pointerout", () => {
      if (this.selectedCharacter !== "Vigilante") {
        this.vigilanteBg.setFillStyle(0x333333);
        this.vigilanteBg.setStrokeStyle(3, 0x555555);
      }
    });
    this.vigilanteBg.on("pointerdown", () => {
      if (!this.isSearching) {
        this.selectCharacter("Vigilante");
      }
    });

    // Find Match button
    this.findMatchButton.on("pointerover", () => {
      this.findMatchButton.setBackgroundColor("#00dd00");
    });
    this.findMatchButton.on("pointerout", () => {
      this.findMatchButton.setBackgroundColor("#00aa00");
    });
    this.findMatchButton.on("pointerdown", () => {
      this.startMatchmaking();
    });

    // Back button
    this.backButton.on("pointerover", () => {
      this.backButton.setBackgroundColor("#333333");
    });
    this.backButton.on("pointerout", () => {
      this.backButton.setBackgroundColor("transparent");
    });
    this.backButton.on("pointerdown", () => {
      if (!this.isSearching) {
        NetworkManager.disconnect();
        this.scene.start("MenuScene");
      }
    });
  }

  connectToServer() {
    NetworkManager.connect();

    // Set up callbacks
    NetworkManager.onMatchFound = (data) => {
      if (import.meta.env.DEV) {
        console.log("Match found, starting battle...");
      }
      this.isSearching = false;

      // The server may assign the other side if both players picked the same one.
      this.registry.set(
        "playerCharacter",
        data.side === "vigilante" ? "Vigilante" : "Independent Detective",
      );
      this.scene.start("CaseBattleScene", { online: data });
    };

    NetworkManager.onConnectionError = (error) => {
      if (!this.scene || !this.scene.isActive() || !this.statusText) return;
      this.statusText.setText("Connection failed! Check if server is running.");
      this.statusText.setColor("#ff0000");
    };

    // Wait a bit then check connection
    this.time.delayedCall(1000, () => {
      if (!this.scene || !this.scene.isActive() || !this.statusText) return;
      if (NetworkManager.connected) {
        this.statusText.setText("✅ Connected to server");
        this.statusText.setColor("#00ff00");
      } else {
        this.statusText.setText("❌ Connection failed - Is server running?");
        this.statusText.setColor("#ff0000");
      }
    });
  }

  selectCharacter(character) {
    this.selectedCharacter = character;

    // Reset both cards
    this.detectiveBg.setFillStyle(0x333333);
    this.detectiveBg.setStrokeStyle(3, 0x555555);
    this.vigilanteBg.setFillStyle(0x333333);
    this.vigilanteBg.setStrokeStyle(3, 0x555555);

    // Highlight selected
    if (character === "Independent Detective") {
      this.detectiveBg.setFillStyle(0x0a3a6a);
      this.detectiveBg.setStrokeStyle(3, 0x00aaff);
    } else {
      this.vigilanteBg.setFillStyle(0x6a0a0a);
      this.vigilanteBg.setStrokeStyle(3, 0xff4444);
    }

    // Show find match button
    this.findMatchButton.setVisible(true);
  }

  startMatchmaking() {
    if (!this.selectedCharacter || !NetworkManager.connected) {
      return;
    }

    this.isSearching = true;

    // Hide find match button, show searching text
    this.findMatchButton.setVisible(false);
    this.searchingText.setVisible(true);

    // Disable character cards
    this.detectiveBg.disableInteractive();
    this.vigilanteBg.disableInteractive();

    // Start searching
    NetworkManager.findMatch(this.selectedCharacter);

    // Add pulsing animation to searching text
    this.tweens.add({
      targets: this.searchingText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  shutdown() {
    // The battle scene installs its own callbacks.
    NetworkManager.onMatchFound = null;
    NetworkManager.onConnectionError = null;
  }
}
