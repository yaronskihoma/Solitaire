import * as Phaser from 'phaser';

export type Suit = 'HEART' | 'DIAMOND' | 'SPADE' | 'CLUB';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  gameObject: Phaser.GameObjects.Image;
  pile: CardPile;
}

export interface CardPile {
  addCard(card: Card): void;
  removeCard(card: Card): void;
}

export class FoundationPile implements CardPile {
  public suit: Suit;
  public cards: Card[] = [];

  constructor(suit: Suit) {
    this.suit = suit;
  }

  public addCard(card: Card): void {
    this.cards.push(card);
  }

  public removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }
}

export class TableauPile implements CardPile {
  public index: number;
  public cards: Card[] = [];

  constructor(index: number) {
    this.index = index;
  }

  public addCard(card: Card): void {
    this.cards.push(card);
  }

  public removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }
}

export class DiscardPile implements CardPile {
  public cards: Card[] = [];

  public addCard(card: Card): void {
    this.cards.push(card);
  }

  public removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }
} 