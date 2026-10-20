import Phaser from 'phaser';
// imports the config object from config.js
import config from './config.js';

const game = new Phaser.Game(config);

// Expose the game for automated play-testing in dev builds only.
if (import.meta.env.DEV) window.__game = game;
