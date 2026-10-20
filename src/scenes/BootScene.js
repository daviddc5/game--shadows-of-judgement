import Phaser from "phaser";
import { FONTS } from "../theme.js";

//define the BootScene class that is the first scene to load

export default class BootScene extends Phaser.Scene {
  // Initialize the scene with a key
  constructor() {
    super({ key: "BootScene" });
  }

  //preload method to load assets
  preload() {
    // Load character portraits - Detective
    this.load.image(
      "detective-neutral",
      "assets/images/DetectivePortraits/detective-neutral.png"
    );
    this.load.image(
      "detective-winning",
      "assets/images/DetectivePortraits/detective-winning.png"
    );
    this.load.image(
      "detective-losing",
      "assets/images/DetectivePortraits/detective-losing.png"
    );

    // Load character portraits - Killer
    this.load.image(
      "killer-neutral",
      "assets/images/KillerPortraits/killer-neutral.png"
    );
    this.load.image(
      "killer-winning",
      "assets/images/KillerPortraits/killer-winning.png"
    );
    this.load.image(
      "killer-losing",
      "assets/images/KillerPortraits/killer-losing.png"
    );
  }

  create() {
    // Canvas text can't swap fonts after drawing, so load every face first.
    Promise.all([
      document.fonts.load(`40px ${FONTS.display}`),
      document.fonts.load(`20px ${FONTS.body}`),
      document.fonts.load(`600 20px ${FONTS.body}`),
    ])
      .catch(() => {})
      .then(() => this.scene.start("TitleScene"));
  }
}
