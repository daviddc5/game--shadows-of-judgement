import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import MenuScene from "./scenes/MenuScene.js";
import MultiplayerLobbyScene from "./scenes/MultiplayerLobbyScene.js";
import BattleScene from "./scenes/BattleScene.js";
import CaseBattleScene from "./scenes/CaseBattleScene.js";
import GameOverScene from "./scenes/GameOverScene.js";
import InstructionsScene from "./scenes/InstructionsScene.js";
import SinglePlayerLobbyScene from "./scenes/SinglePlayerLobbyScene.js";

const config = {
  //type is the rendering context
  type: Phaser.AUTO,
  //Higher resolution for sharper graphics (2x mobile size)
  width: 750,
  height: 1334,
  parent: "game-container",
  backgroundColor: 0x000000,
  //responsive scaling for all screen sizes
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  //render settings for sharper text
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  //sets the scenes to load
  scene: [
    BootScene,
    TitleScene,
    MenuScene,
    MultiplayerLobbyScene,
    BattleScene,
    CaseBattleScene,
    GameOverScene,
    InstructionsScene,
    SinglePlayerLobbyScene,
  ],
};

export default config;
