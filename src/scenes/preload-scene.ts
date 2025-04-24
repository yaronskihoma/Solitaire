import * as Phaser from 'phaser';
import { ASSET_KEYS, CARD_HEIGHT, CARD_WIDTH, SCENE_KEYS } from './common';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  public preload(): void {
    this.load.image(ASSET_KEYS.BACKGROUND, 'assets/images/Background.jpg');
    this.load.image(ASSET_KEYS.TITLE, 'assets/images/title.png');
    this.load.image(ASSET_KEYS.CLICK_TO_START, 'assets/images/clickToStart.png');
    this.load.spritesheet(ASSET_KEYS.CARDS, 'assets/images/Cards_sprite.png', {
      frameWidth: CARD_WIDTH,
      frameHeight: CARD_HEIGHT,
    });
    this.load.spritesheet(ASSET_KEYS.CARD_SYMBOLS, 'assets/images/Cards_symbols_sprite.png', {
      frameWidth: CARD_WIDTH,
      frameHeight: CARD_HEIGHT,
    });
  }

  public create(): void {
    this.scene.start(SCENE_KEYS.TITLE);
  }
}
