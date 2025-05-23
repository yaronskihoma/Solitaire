// used for drawing out game objects for debugging our player input
const DEBUG = false;
// the scale factor that will be applied to our card image game objects , increased by 20% more
const SCALE = 0.45;  // 0.2875 * 1.2
// the frame of the card spritesheet that represents the back of a card
const CARD_BACK_FRAME = 52;
// Calculate the total width of the tableau (7 piles with spacing)
// Each card is scaled to 0.345 of original size (210px), so each card is about 71.25px wide
// We'll add some spacing between piles (about 45.75px) to make it look nice
// Total width = (71.25 * 7) + (45.75 * 6) ≈ 753.75px

// Calculate center position for the game area
const CENTER_OFFSET_X = 583;  // (1920 - 753.75)/2
const CENTER_OFFSET_Y = 50;  // Start a bit from the top

// the x & y positions of were the foundation piles will be placed in our game area
const FOUNDATION_PILE_X_POSITIONS = [0, 117, 234, 351].map(x => x + CENTER_OFFSET_X);  // Increased spacing by 20%
const FOUNDATION_PILE_Y_POSITION = CENTER_OFFSET_Y;
// the x & y position of were the discard pile will be placed in our game area
const DISCARD_PILE_X_POSITION = CENTER_OFFSET_X + 585;
const DISCARD_PILE_Y_POSITION = CENTER_OFFSET_Y;
// the x & y position of were the draw pile will be placed in our game area
const DRAW_PILE_X_POSITION = CENTER_OFFSET_X + 700;
const DRAW_PILE_Y_POSITION = CENTER_OFFSET_Y;
// the x & y position of were the tableau pile will be placed in our game area
const TABLEAU_PILE_X_POSITION = CENTER_OFFSET_X;
const TABLEAU_PILE_Y_POSITION = CENTER_OFFSET_Y + 200;
// Add custom Y positions for each tableau pile
const TABLEAU_PILE_Y_POSITIONS = [
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 230,    // First pile
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 180,    // Second pile (10px lower)
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 250,   // Third pile (20px lower)
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 350,   // Fourth pile (30px lower)
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 250,   // Fifth pile (40px lower)
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 180,   // Sixth pile (50px lower)
  CENTER_OFFSET_Y + CENTER_OFFSET_Y + 230,   // Seventh pile (60px lower)
];
// the starting frame of the card suit in the card spritesheet that represents the various cards
const SUIT_FRAMES = {
  HEART: 26,
  DIAMOND: 13,
  SPADE: 39,
  CLUB: 0,
};

type ZoneType = keyof typeof ZONE_TYPE;
// the different type of drop zones, or areas players can drop cards in the game
const ZONE_TYPE = {
  FOUNDATION: 'FOUNDATION',
  TABLEAU: 'TABLEAU',
} as const;

import * as Phaser from 'phaser';
import { ASSET_KEYS, CARD_HEIGHT, CARD_WIDTH, SCENE_KEYS } from './common';
import { Solitaire } from '../lib/solitaire';
import { Card as GameCard } from '../lib/card';
import { FoundationPile } from '../lib/foundation-pile';
import { Card as UICard, CardPile, TableauPile, DiscardPile } from '../lib/types';

export class GameScene extends Phaser.Scene {
  // All properties grouped at the top, properly initialized
  #tableauContainers: Phaser.GameObjects.Container[] = [];
  #drawPileCards: Phaser.GameObjects.Image[] = [];
  #discardPileCards: Phaser.GameObjects.Image[] = [];
  #foundationPileCards: Phaser.GameObjects.Image[] = [];
  private solitaire: Solitaire;
  #foundationPiles: FoundationPile[] = [];
  #tableauPiles: TableauPile[] = [];
  #discardPile: DiscardPile;
  #cards: Map<Phaser.GameObjects.Image, GameCard> = new Map();

  constructor() {
    super({ key: SCENE_KEYS.GAME });
    this.solitaire = new Solitaire();
    this.#discardPile = new DiscardPile();
  }

  public create(): void {
    this.add.image(0, 0, ASSET_KEYS.BACKGROUND)
      .setOrigin(0, 0)
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    // Initialize the Solitaire game state
    this.solitaire.newGame();

    // setup game objects based on solitaire game state
    this.#createDrawPile();
    this.#createDiscardPile();
    this.#createFoundationPiles();
    this.#createTableauPiles();
    this.#createDragEvents();    // setup drop zones for interactions and events for drag
    this.#createDropZones();
  }

  #createCard(
    x: number,
    y: number,
    draggable: boolean,
    cardIndex?: number,
    pileIndex?: number,
  ): Phaser.GameObjects.Image {
    return this.add
      .image(x, y, ASSET_KEYS.CARDS, CARD_BACK_FRAME)
      .setOrigin(0)
      .setScale(SCALE)
      .setInteractive({ draggable })
      .setData({
        x,
        y,
        cardIndex,
        pileIndex,
      });
  }

  #drawCardLocationBox(x: number, y: number): void {
    this.add.rectangle(x, y, 100, 160)
      .setOrigin(0)
      .setStrokeStyle(2, 0xFFFFFF, 0.5)
      .setFillStyle(0x000000, 0.3);  // Black color with 30% opacity
  }

  #createDrawPile(): void {
    this.#drawCardLocationBox(DRAW_PILE_X_POSITION, DRAW_PILE_Y_POSITION);
    this.#drawPileCards = [];
    for (let i = 0; i < 3; i += 1) {
      this.#drawPileCards.push(
        this.#createCard(DRAW_PILE_X_POSITION + i * 5, DRAW_PILE_Y_POSITION, true)
      );
    }

    // create zone to listen for click events, which triggers the drawing card logic
    const drawZone = this.add
      .zone(DRAW_PILE_X_POSITION, DRAW_PILE_Y_POSITION, CARD_WIDTH * SCALE + 20, CARD_HEIGHT * SCALE + 12)
      .setOrigin(0)
      .setInteractive();
    drawZone.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // if no cards in either pile, we don't need to do anything in the ui
      if (this.solitaire.drawPile.length === 0 && this.solitaire.discardPile.length === 0) {
        return;
      }

      // if no cards in draw pile, we need to shuffle in discard pile
      if (this.solitaire.drawPile.length === 0) {
        // shuffle in discard pile
        this.solitaire.shuffleDiscardPile();
        // show no cards in discard pile
        this.#discardPileCards.forEach((card) => card.setVisible(false));
        // show cards in draw pile based on number of cards in pile
        this.#showCardsInDrawPile();
        return;
      }

      // reaching here means we have cards in the draw pile, so we need to draw a card
      this.solitaire.drawCard();
      // update the shown cards in the draw pile to be based on number of cards in pile
      this.#showCardsInDrawPile();
      // update the bottom card in the discard pile to reflect the top card
      this.#discardPileCards[0].setFrame(this.#discardPileCards[1].frame).setVisible(this.#discardPileCards[1].visible);
      // update the top card in the discard pile to reflect card we drew
      const card = this.solitaire.discardPile[this.solitaire.discardPile.length - 1];
      if (card) {
        this.#discardPileCards[1].setFrame(this.#getCardFrame(card)).setVisible(true);
      }
    });

    if (DEBUG) {
      this.add.rectangle(drawZone.x, drawZone.y, drawZone.width, drawZone.height, 0xff0000, 0.5).setOrigin(0);
    }
  }

  #showCardsInDrawPile(): void {
    const numberOfCardsToShow = Math.min(this.solitaire.drawPile.length, 3);
    this.#drawPileCards.forEach((card, cardIndex) => {
      const showCard = cardIndex < numberOfCardsToShow;
      card.setVisible(showCard);
    });
  }

  #getCardFrame(data: GameCard | FoundationPile): number {
    return SUIT_FRAMES[data.suit] + data.value - 1;
  }
  
  #createDiscardPile(): void {
    // create outline for pile
    this.#drawCardLocationBox(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION);
  
    // create initial discard pile game object cards, we will only need two game objects, which will represent the two most recently drawn cards
    // at the start of the game, these will not be visible until the player draws a new card
    this.#discardPileCards = [];
    const bottomCard = this.#createCard(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION, true)
      .setVisible(false);
    const topCard = this.#createCard(DISCARD_PILE_X_POSITION, DISCARD_PILE_Y_POSITION, true)
      .setVisible(false);
    this.#discardPileCards.push(bottomCard, topCard);
  }
  #createFoundationPiles(): void {
    this.#foundationPileCards = [];
  
    // create outline for each foundation pile
    FOUNDATION_PILE_X_POSITIONS.forEach((x, index) => {
      this.#drawCardLocationBox(x, FOUNDATION_PILE_Y_POSITION);
      
      // Add suit symbol to each foundation pile using the card symbols sprite
      // The symbols are in the same order as the SUIT_FRAMES: HEART, DIAMOND, SPADE, CLUB
      let symbolFrame = 0;
      switch(index) {
        case 0: // Heart
          symbolFrame = 0;
          break;
        case 1: // Spade
          symbolFrame = 2;
          break;
        case 2: // Club
          symbolFrame = 3;
          break;
        case 3: // Diamond
          symbolFrame = 1;
          break;
      }
      
      // Add the suit symbol image
      this.add.image(x + (CARD_WIDTH * SCALE) / 2, FOUNDATION_PILE_Y_POSITION + (CARD_HEIGHT * SCALE) / 2, ASSET_KEYS.CARD_SYMBOLS, symbolFrame)
        .setOrigin(0.5)
        .setScale(SCALE); // Increased from SCALE * 0.5 to SCALE (twice as big)
      
      // create phaser game object for each pile, these will not be visible at game start
      // but once we add the ace to the pile, we will make this card visible
      const card = this.#createCard(x, FOUNDATION_PILE_Y_POSITION, true)
        .setVisible(false);
      this.#foundationPileCards.push(card);
    });
  }
  #createTableauPiles(): void {
    this.#tableauContainers = [];

    this.solitaire.tableauPiles.forEach((pile, pileIndex) => {
      const x = TABLEAU_PILE_X_POSITION + pileIndex * 117;  // Using your custom spacing
      const y = TABLEAU_PILE_Y_POSITIONS[pileIndex];  // Using your custom Y positions
      const tableauContainer = this.add.container(x, y, []);
      this.#tableauContainers.push(tableauContainer);
      
      pile.forEach((card, cardIndex) => {
        const cardGameObject = this.#createCard(0, cardIndex * 40, false, cardIndex, pileIndex);  // Using your custom spacing
        tableauContainer.add(cardGameObject);
        if (card.isFaceUp) {
          cardGameObject.setFrame(this.#getCardFrame(card));
          this.input.setDraggable(cardGameObject);
        }
      });
    });
  }
  #createDropZones(): void {
    // create drop zone for foundation piles, in the game we will have 1 drop zone and then automatically place the card in the pile it belongs
    // for each drop zone, we add custom data so when the `drag` event listener is invoked, we can run specific logic to that zone type
    let zone = this.add
      .zone(FOUNDATION_PILE_X_POSITIONS[0], FOUNDATION_PILE_Y_POSITION, CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE)
      .setOrigin(0)
      .setRectangleDropZone(CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE)
      .setData({
        zoneType: ZONE_TYPE.FOUNDATION,
      });
    if (DEBUG) {
      this.add.rectangle(FOUNDATION_PILE_X_POSITIONS[0], FOUNDATION_PILE_Y_POSITION, zone.width, zone.height, 0xff0000, 0.2).setOrigin(0);
    }

    // drop zone for each tableau pile in the game (the 7 main piles)
    for (let i = 0; i < 7; i += 1) {
      const x = TABLEAU_PILE_X_POSITION + i * 117;  // Match the spacing we use for tableau piles
      const y = TABLEAU_PILE_Y_POSITIONS[i];  // Use the same Y positions as our tableau piles
      zone = this.add
        .zone(x, y, CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE * 13)  // Height for stacked cards
        .setOrigin(0)
        .setRectangleDropZone(CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE * 13)
        .setData({
          zoneType: ZONE_TYPE.TABLEAU,
          tableauIndex: i,
        })
        .setDepth(-1);
      if (DEBUG) {
        this.add.rectangle(x, y, zone.width, zone.height, 0xff0000, 0.5).setOrigin(0);
      }
    }
  }
  #createDragEvents(): void {
    this.#createDragStartEventListener();
    this.#createOnDragEventListener();
    this.#createDragEndEventListener();
    this.#createDropEventListener();
  }
  
  #createDragStartEventListener(): void {
    // listen for the drag start event on a game object, this will be used to store the original position of the game
    // object, that way we can put the object back in the original position if an invalid move is made
    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        // store objects position
        gameObject.setData({ x: gameObject.x, y: gameObject.y });
        // update depth on container or image game object, so when we drag the card it is visible above all other game objects
        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        if (tableauPileIndex !== undefined) {
          this.#tableauContainers[tableauPileIndex].setDepth(2);
        } else {
          gameObject.setDepth(2);
        }
        // update card objects alpha so we know which card is actively being dragged
        gameObject.setAlpha(0.8);
      },
    );
  }
  
  /**
   * Determines the number of cards that should also be moved with the current card game object that is being
   * dragged. Example, in a pile I have the cards 5 -> 4 -> 3, and I want to move the whole stack, when I drag the 5
   * card, cards 4 and 3 should also move. If I drag the 4 card, we should not move card 5, but card 3 should be
   * moved with card 4.
   */
  #getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex: number, cardIndex: number): number {
    if (tableauPileIndex !== undefined) {
      const lastCardIndex = this.#tableauContainers[tableauPileIndex].length - 1;
      if (lastCardIndex === cardIndex) {
        return 0;
      }

      return lastCardIndex - cardIndex;
    }
    return 0;
  }

  #createOnDragEventListener(): void {
    // listen for the drag event on a game object, this will be used to move game objects along the mouse path
    // as we click and drag an object in our scene
    this.input.on(
      Phaser.Input.Events.DRAG,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
        gameObject.setPosition(dragX, dragY);
  
        // if card is part of the tableau, we need to move all cards that are stacked on top of this card
        const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
        const cardIndex = gameObject.getData('cardIndex') as number;
        if (tableauPileIndex !== undefined) {
          const numberOfCardsToMove = this.#getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);
          for (let i = 1; i <= numberOfCardsToMove; i += 1) {
            this.#tableauContainers[tableauPileIndex]
              .getAt<Phaser.GameObjects.Image>(cardIndex + i)
              .setPosition(dragX, dragY + 40 * i);
          }
        }
      },
    );
  }
  
  #createDragEndEventListener(): void {
    // listen for the drag end event on a game object, this will be used to check were the game object was placed
    // in our scene, and depending on were the object was placed we will check if that is a valid move in our game
    // otherwise, we will reset the objects position back to were the object was originally located at
    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
        // if game object was not destroyed, still active, we need to update that game objects data to match were the card was placed
        if (gameObject.active) {
          const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
          if (tableauPileIndex !== undefined) {
            this.#tableauContainers[tableauPileIndex].setDepth(0);
          } else {
            gameObject.setDepth(0);
          }

          gameObject.setPosition(gameObject.getData('x') as number, gameObject.getData('y') as number);
          // reset card game objects alpha since we are done moving the object
          gameObject.setAlpha(1);

          // if card is part of the tableau, we need to move all cards that are stacked on top of this card back to the original location as well
          const cardIndex = gameObject.getData('cardIndex') as number;
          if (tableauPileIndex !== undefined) {
            const numberOfCardsToMove = this.#getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex, cardIndex);
            for (let i = 1; i <= numberOfCardsToMove; i += 1) {
              const cardToMove = this.#tableauContainers[tableauPileIndex].getAt<Phaser.GameObjects.Image>(
                cardIndex + i,
              );
              cardToMove.setPosition(cardToMove.getData('x') as number, cardToMove.getData('y') as number);
            }
          }
        }
      },
    );
  }

  #createDropEventListener(): void {
    // listen for drop events on a game object, this will be used for knowing which card pile a player is trying to add a card game object to
    // which will then trigger validation logic to check if a valid move was maded
    this.input.on(
      Phaser.Input.Events.DROP,
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dropZone: Phaser.GameObjects.Zone) => {
        const zoneType = dropZone.getData('zoneType') as ZoneType;
        if (zoneType === ZONE_TYPE.FOUNDATION) {
          console.log('Card dropped on foundation pile');
          this.#handleMoveCardToFoundation(gameObject);
          return;
        }
        const tableauIndex = dropZone.getData('tableauIndex') as number;
        console.log('Card dropped on tableau pile', tableauIndex);
        this.#handleMoveCardTableau(gameObject, tableauIndex);
      },
    );
  }

  #handleMoveCardToFoundation(gameObject: Phaser.GameObjects.Image): void {
    let isValidMove = false;
    let isCardFromDiscardPile = false;

    // check if card is from discard pile or tableau pile based on the pileIndex in the data manager
    const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
    if (tableauPileIndex === undefined) {
      console.log('Moving card from discard pile to foundation');
      isValidMove = this.solitaire.playDiscardPileCardToFoundation();
      isCardFromDiscardPile = true;
    } else {
      console.log('Moving card from tableau pile', tableauPileIndex, 'to foundation');
      isValidMove = this.solitaire.moveTableauCardToFoundation(tableauPileIndex);
    }

    // if this is not a valid move, we don't need to update anything on the card since the `dragend` event handler will
    // move the card back to the original location
    if (!isValidMove) {
      console.log('Invalid move to foundation');
      return;
    }

    // update discard pile cards, or flip over tableau cards if needed
    if (isCardFromDiscardPile) {
      this.#updateCardGameObjectsInDiscardPile();
    } else {
      this.#handleRevealingNewTableauCards(tableauPileIndex as number);
    }

    // only destroy card from tableau, since we need to reuse the card from the discard pile
    if (!isCardFromDiscardPile) {
      gameObject.destroy();
    }
    // update our phaser game objects
    this.#updateFoundationPiles();
  }

  #getCardFromGameObject(gameObject: Phaser.GameObjects.Image): GameCard | undefined {
    return this.#cards.get(gameObject);
  }

  #getTargetFoundationPile(card: GameCard): FoundationPile | undefined {
    return this.#foundationPiles.find(pile => pile.suit === card.suit);
  }

  #updateCardVisual(card: UICard, pile: CardPile): void {
    const gameObject = card.gameObject;
    if (pile instanceof FoundationPile) {
      const pileIndex = this.#foundationPiles.indexOf(pile);
      gameObject.setPosition(FOUNDATION_PILE_X_POSITIONS[pileIndex], FOUNDATION_PILE_Y_POSITION);
      gameObject.setVisible(true);
    }
  }

  #handleMoveCardTableau(gameObject: Phaser.GameObjects.Image, targetTableauPileIndex: number): void {
    let isValidMove = false;
    let isCardFromDiscardPile = false;

    // store reference to the original size of the tableau pile so we know were to place game object
    const originalTargetPileSize = this.#tableauContainers[targetTableauPileIndex].length;

    // check if card is from discard pile or tableau pile based on the pileIndex in the data manager
    const tableauPileIndex = gameObject.getData('pileIndex') as number | undefined;
    const tableauCardIndex = gameObject.getData('cardIndex') as number;

    // If card is being dropped in the same tableau pile, just return it to its original position
    if (tableauPileIndex === targetTableauPileIndex) {
      console.log('Card dropped in same tableau pile, returning to original position');
      return;
    }

    if (tableauPileIndex === undefined) {
      console.log('Moving card from discard pile to tableau pile', targetTableauPileIndex);
      isValidMove = this.solitaire.playDiscardPileCardToTableau(targetTableauPileIndex);
      isCardFromDiscardPile = true;
    } else {
      console.log('Moving card from tableau pile', tableauPileIndex, 'to tableau pile', targetTableauPileIndex);
      isValidMove = this.solitaire.moveTableauCardsToAnotherTableau(
        tableauPileIndex,
        tableauCardIndex,
        targetTableauPileIndex,
      );
    }

    // if this is not a valid move, we don't need to update anything on the card(s) since the `dragend` event handler will
    // move the card(s) back to the original location
    if (!isValidMove) {
      console.log('Invalid move to tableau');
      return;
    }

    // add single discard pile card to tableau as a new game object
    if (isCardFromDiscardPile) {
      const card = this.#createCard(
        0,
        originalTargetPileSize * 40,  // Changed from 20 to 40 to match initial spacing
        true,
        originalTargetPileSize,
        targetTableauPileIndex,
      );
      card.setFrame(gameObject.frame);
      this.#tableauContainers[targetTableauPileIndex].add(card);
      // update the remaining cards in discard pile
      this.#updateCardGameObjectsInDiscardPile();
      return;
    }

    // for each card in the current stack that is being moved, we need to remove the card from
    // the existing container and add to the target tableau container
    const numberOfCardsToMove = this.#getNumberOfCardsToMoveAsPartOfStack(tableauPileIndex as number, tableauCardIndex);
    console.log('Moving', numberOfCardsToMove + 1, 'cards to tableau pile', targetTableauPileIndex);
    for (let i = 0; i <= numberOfCardsToMove; i += 1) {
      const cardGameObject =
        this.#tableauContainers[tableauPileIndex as number].getAt<Phaser.GameObjects.Image>(tableauCardIndex);
      this.#tableauContainers[tableauPileIndex as number].removeAt(tableauCardIndex);
      this.#tableauContainers[targetTableauPileIndex].add(cardGameObject);

      // update phaser game object data to match the new values for tableau and card index
      const cardIndex = originalTargetPileSize + i;
      cardGameObject.setData({
        x: 0,
        y: cardIndex * 40,  // Changed from 20 to 40 to match initial spacing
        cardIndex,
        pileIndex: targetTableauPileIndex,
      });
    }

    // update depth on container to be the original value
    this.#tableauContainers[tableauPileIndex as number].setDepth(0);

    // get the cards tableau pile and check to see if the new card at the bottom of the stack should be flipped over
    this.#handleRevealingNewTableauCards(tableauPileIndex as number);
  }

  #handleRevealingNewTableauCards(tableauPileIndex: number): void {
    // update tableau container depth
    this.#tableauContainers[tableauPileIndex].setDepth(0);
    // check to see if the tableau pile card at the bottom of the stack needs to be flipped over
    const flipTableauCard = this.solitaire.flipTopTableauCard(tableauPileIndex);
    if (flipTableauCard) {
      const tableauPile = this.solitaire.tableauPiles[tableauPileIndex];
      const tableauCard = tableauPile[tableauPile.length - 1];
      const cardGameObject = this.#tableauContainers[tableauPileIndex].getAt<Phaser.GameObjects.Image>(
        tableauPile.length - 1,
      );
      cardGameObject.setFrame(this.#getCardFrame(tableauCard));
      this.input.setDraggable(cardGameObject);
    }
  }

  #updateCardGameObjectsInDiscardPile(): void {
    // update the top card in the discard pile to reflect the card below it
    this.#discardPileCards[1].setFrame(this.#discardPileCards[0].frame).setVisible(this.#discardPileCards[0].visible);
    // update the bottom card in the discard pile to have the correct value based on the solitaire game state
    const discardPileCard = this.solitaire.discardPile[this.solitaire.discardPile.length - 2];
    if (discardPileCard === undefined) {
      this.#discardPileCards[0].setVisible(false);
    } else {
      this.#discardPileCards[0].setFrame(this.#getCardFrame(discardPileCard)).setVisible(true);
    }
  }

  #updateFoundationPiles(): void {
    this.solitaire.foundationPiles.forEach((pile: FoundationPile, pileIndex: number) => {
      if (pile.value === 0) {
        return;
      }

      this.#foundationPileCards[pileIndex].setVisible(true).setFrame(this.#getCardFrame(pile));
    });
  }
}

