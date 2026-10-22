import Phaser from 'phaser';
// imports the config object from config.js
import config from './config.js';
import { installTextScale } from './theme.js';

// Reading text follows the text size chosen on the Appearance screen.
installTextScale(Phaser);

const game = new Phaser.Game(config);

// Expose the game for automated play-testing in dev builds only.
if (import.meta.env.DEV) window.__game = game;
