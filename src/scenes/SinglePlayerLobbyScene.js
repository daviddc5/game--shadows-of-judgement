import Phaser from "phaser";
import { FONTS } from "../theme.js";

export default class SinglePlayerLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "SinglePlayerLobbyScene" });
    this.selectedCharacter = null;
    this.debugMode = false;
  }

  init(data) {
    this.debugMode = import.meta.env.DEV && !!data?.debugMode;
  }

  create() {
    const centerX = this.cameras.main.width / 2;

    // Title
    this.add
      .text(centerX, 150, "SINGLE PLAYER", {
        fontFamily: FONTS.display,
        fontSize: "72px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    if (import.meta.env.DEV && this.debugMode) {
      this.add
        .text(centerX, 210, "TEST MODE ENABLED", {
          fontFamily: FONTS.display,
          fontSize: "28px",
          color: "#ffcc66",
          align: "center",
        })
        .setOrigin(0.5);
    }

    // Character selection title
    this.add
      .text(centerX, 280, "Choose Your Character", {
        fontFamily: FONTS.display,
        fontSize: "40px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    // === DETECTIVE OPTION ===
    // Detective card background
    this.detectiveBg = this.add
      .rectangle(centerX, 460, 600, 200, 0x333333, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x555555);

    // Detective portrait
    this.detectivePortrait = this.add
      .image(centerX - 210, 460, "detective-neutral")
      .setDisplaySize(140, 140)
      .setOrigin(0.5);

    // Detective text
    this.detectiveLabel = this.add
      .text(centerX + 30, 430, "Independent Detective", {
        fontFamily: FONTS.display,
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
    // Vigilante card background
    this.vigilanteBg = this.add
      .rectangle(centerX, 700, 600, 200, 0x333333, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0x555555);

    // Vigilante portrait
    this.vigilantePortrait = this.add
      .image(centerX - 210, 700, "killer-neutral")
      .setDisplaySize(140, 140)
      .setOrigin(0.5);

    // Vigilante text
    this.vigilanteLabel = this.add
      .text(centerX + 30, 670, "Vigilante", {
        fontFamily: FONTS.display,
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

    // Start Game button (hidden until character selected)
    this.startButton = this.add
      .text(centerX, 900, "START GAME", {
        fontFamily: FONTS.display,
        fontSize: "56px",
        color: "#ffffff",
        padding: { x: 80, y: 30 },
        backgroundColor: "#00aa00",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    // Back button
    this.backButton = this.add
      .text(100, 80, "← BACK", {
        fontFamily: FONTS.display,
        fontSize: "36px",
        color: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    this.setupButtons();
  }

  setupButtons() {
    // Detective selection
    this.detectiveBg.on("pointerover", () => {
      if (this.selectedCharacter !== "Independent Detective") {
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
      this.selectCharacter("Independent Detective");
    });

    // Vigilante selection
    this.vigilanteBg.on("pointerover", () => {
      if (this.selectedCharacter !== "Vigilante") {
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
      this.selectCharacter("Vigilante");
    });

    // Start button
    this.startButton.on("pointerover", () =>
      this.startButton.setBackgroundColor("#00dd00"),
    );
    this.startButton.on("pointerout", () =>
      this.startButton.setBackgroundColor("#00aa00"),
    );
    this.startButton.on("pointerdown", () => {
      if (this.selectedCharacter) {
        this.registry.set("playerCharacter", this.selectedCharacter);
        this.scene.start("CaseBattleScene");
      }
    });

    // Back button
    this.backButton.on("pointerover", () =>
      this.backButton.setBackgroundColor("#333333"),
    );
    this.backButton.on("pointerout", () =>
      this.backButton.setBackgroundColor("transparent"),
    );
    this.backButton.on("pointerdown", () => {
      this.scene.start("MenuScene");
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

    // Show start button
    this.startButton.setVisible(true);
  }
}
