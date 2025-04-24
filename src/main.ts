import * as Phaser from 'phaser';
import { PreloadScene } from './scenes/preload-scene';
import { TitleScene } from './scenes/title-scene';
import { GameScene } from './scenes/game-scene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  pixelArt: true,
  scale: {
    parent: 'game-container',
    width: 1920,
    height: 1080,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    mode: Phaser.Scale.FIT,
  },
  backgroundColor: '#5c5b5b',
  scene: [PreloadScene, TitleScene, GameScene],
};

window.onload = () => {
  new Phaser.Game(gameConfig);
};
