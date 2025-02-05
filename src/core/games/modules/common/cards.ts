// The suit of the card
export enum CardSuit {
  NULL,
  CLUBS,
  DIAMONDS,
  HEARTS,
  SPADES,
}

// The value of the card
export enum CardValue {
  NULL,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  JACK,
  QUEEN,
  KING,
  ACE
}

// An individual card in a deck
export interface Card {
  suit: CardSuit;
  value: CardValue;
}

export const NULL_CARD = {
  suit: CardSuit.NULL,
  value: CardValue.NULL,
}

// The standard French 52-card deck
export const STANDARD_DECK: Card[] = [
  // All clubs
  { suit: CardSuit.CLUBS, value: CardValue.TWO },
  { suit: CardSuit.CLUBS, value: CardValue.THREE },
  { suit: CardSuit.CLUBS, value: CardValue.FOUR },
  { suit: CardSuit.CLUBS, value: CardValue.FIVE },
  { suit: CardSuit.CLUBS, value: CardValue.SIX },
  { suit: CardSuit.CLUBS, value: CardValue.SEVEN },
  { suit: CardSuit.CLUBS, value: CardValue.EIGHT },
  { suit: CardSuit.CLUBS, value: CardValue.NINE },
  { suit: CardSuit.CLUBS, value: CardValue.TEN },
  { suit: CardSuit.CLUBS, value: CardValue.JACK },
  { suit: CardSuit.CLUBS, value: CardValue.QUEEN },
  { suit: CardSuit.CLUBS, value: CardValue.KING },
  { suit: CardSuit.CLUBS, value: CardValue.ACE },

  // All diamonds
  { suit: CardSuit.DIAMONDS, value: CardValue.TWO },
  { suit: CardSuit.DIAMONDS, value: CardValue.THREE },
  { suit: CardSuit.DIAMONDS, value: CardValue.FOUR },
  { suit: CardSuit.DIAMONDS, value: CardValue.FIVE },
  { suit: CardSuit.DIAMONDS, value: CardValue.SIX },
  { suit: CardSuit.DIAMONDS, value: CardValue.SEVEN },
  { suit: CardSuit.DIAMONDS, value: CardValue.EIGHT },
  { suit: CardSuit.DIAMONDS, value: CardValue.NINE },
  { suit: CardSuit.DIAMONDS, value: CardValue.TEN },
  { suit: CardSuit.DIAMONDS, value: CardValue.JACK },
  { suit: CardSuit.DIAMONDS, value: CardValue.QUEEN },
  { suit: CardSuit.DIAMONDS, value: CardValue.KING },
  { suit: CardSuit.DIAMONDS, value: CardValue.ACE },

  // All hearts
  { suit: CardSuit.HEARTS, value: CardValue.TWO },
  { suit: CardSuit.HEARTS, value: CardValue.THREE },
  { suit: CardSuit.HEARTS, value: CardValue.FOUR },
  { suit: CardSuit.HEARTS, value: CardValue.FIVE },
  { suit: CardSuit.HEARTS, value: CardValue.SIX },
  { suit: CardSuit.HEARTS, value: CardValue.SEVEN },
  { suit: CardSuit.HEARTS, value: CardValue.EIGHT },
  { suit: CardSuit.HEARTS, value: CardValue.NINE },
  { suit: CardSuit.HEARTS, value: CardValue.TEN },
  { suit: CardSuit.HEARTS, value: CardValue.JACK },
  { suit: CardSuit.HEARTS, value: CardValue.QUEEN },
  { suit: CardSuit.HEARTS, value: CardValue.KING },
  { suit: CardSuit.HEARTS, value: CardValue.ACE },

  // All spades
  { suit: CardSuit.SPADES, value: CardValue.TWO },
  { suit: CardSuit.SPADES, value: CardValue.THREE },
  { suit: CardSuit.SPADES, value: CardValue.FOUR },
  { suit: CardSuit.SPADES, value: CardValue.FIVE },
  { suit: CardSuit.SPADES, value: CardValue.SIX },
  { suit: CardSuit.SPADES, value: CardValue.SEVEN },
  { suit: CardSuit.SPADES, value: CardValue.EIGHT },
  { suit: CardSuit.SPADES, value: CardValue.NINE },
  { suit: CardSuit.SPADES, value: CardValue.TEN },
  { suit: CardSuit.SPADES, value: CardValue.JACK },
  { suit: CardSuit.SPADES, value: CardValue.QUEEN },
  { suit: CardSuit.SPADES, value: CardValue.KING },
  { suit: CardSuit.SPADES, value: CardValue.ACE },
]

export class Deck {
  // The cards in the deck
  cards: Card[];

  /**
   * Creates a new deck
   * @param initial The values of the cards to put in the deck
   * @param shuffle Whether to shuffle the cards once the deck is created
   */
  constructor(initial?: Card[], shuffle?: boolean) {
    this.cards = initial || [];
    if (shuffle) this.shuffle();
  }

  /**
   * Draws the card from the top of the deck
   * @returns A card from the deck, if there are any
   */
  draw() {
    return this.cards.pop();
  }

  /**
   * Shuffles all cards in-place using the Fisher-Yates algorithm
   * Code from https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#JavaScript_Implementation
   */
  shuffle() {
    for (let i = this.cards.length - 1; i >= 1; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}