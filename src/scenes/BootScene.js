import Phaser from "phaser";
import { FONTS } from "../theme.js";
import { SIDES } from "../case/cards.js";
import { portraitFiles } from "../case/characters.js";
import { DUEL_THEME, SFX, sfxKey } from "../audio.js";

//define the BootScene class that is the first scene to load

export default class BootScene extends Phaser.Scene {
  // Initialize the scene with a key
  constructor() {
    super({ key: "BootScene" });
  }

  //preload method to load assets
  preload() {
    // Character portraits (every mood listed in src/case/characters.js).
    for (const { key, path } of portraitFiles()) {
      this.load.image(key, `assets/images/${path}`);
    }

    this.loadCardArt();
    this.load.audio(DUEL_THEME, "assets/audio/duel-theme.mp3");
    for (const name of Object.keys(SFX)) this.load.audio(sfxKey(name), `assets/audio/sfx/${name}.mp3`);
  }

  /** Card art: any card with `art: "<name>"` loads public/assets/images/cards/<name>.png. */
  loadCardArt() {
    for (const side of Object.values(SIDES)) {
      for (const card of side.cards) {
        if (card.art) this.load.image(card.art, `assets/images/cards/${card.art}.png`);
      }
    }
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
