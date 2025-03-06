/**
 * Shuffles an array in-place using the Fisher-Yates algorithm
 * Code from https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#JavaScript_Implementation
 */
export const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// The suit of the card
export enum CardSuit {
  NULL,
  CLUBS,
  DIAMONDS,
  HEARTS,
  SPADES,
}

// The rank of the card
export enum CardRank {
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
  rank: CardRank;
}

export const NULL_CARD = {
  suit: CardSuit.NULL,
  rank: CardRank.NULL,
}

// The standard French 52-card deck
export const STANDARD_DECK: Card[] = [
  // All clubs
  { suit: CardSuit.CLUBS, rank: CardRank.TWO },
  { suit: CardSuit.CLUBS, rank: CardRank.THREE },
  { suit: CardSuit.CLUBS, rank: CardRank.FOUR },
  { suit: CardSuit.CLUBS, rank: CardRank.FIVE },
  { suit: CardSuit.CLUBS, rank: CardRank.SIX },
  { suit: CardSuit.CLUBS, rank: CardRank.SEVEN },
  { suit: CardSuit.CLUBS, rank: CardRank.EIGHT },
  { suit: CardSuit.CLUBS, rank: CardRank.NINE },
  { suit: CardSuit.CLUBS, rank: CardRank.TEN },
  { suit: CardSuit.CLUBS, rank: CardRank.JACK },
  { suit: CardSuit.CLUBS, rank: CardRank.QUEEN },
  { suit: CardSuit.CLUBS, rank: CardRank.KING },
  { suit: CardSuit.CLUBS, rank: CardRank.ACE },

  // All diamonds
  { suit: CardSuit.DIAMONDS, rank: CardRank.TWO },
  { suit: CardSuit.DIAMONDS, rank: CardRank.THREE },
  { suit: CardSuit.DIAMONDS, rank: CardRank.FOUR },
  { suit: CardSuit.DIAMONDS, rank: CardRank.FIVE },
  { suit: CardSuit.DIAMONDS, rank: CardRank.SIX },
  { suit: CardSuit.DIAMONDS, rank: CardRank.SEVEN },
  { suit: CardSuit.DIAMONDS, rank: CardRank.EIGHT },
  { suit: CardSuit.DIAMONDS, rank: CardRank.NINE },
  { suit: CardSuit.DIAMONDS, rank: CardRank.TEN },
  { suit: CardSuit.DIAMONDS, rank: CardRank.JACK },
  { suit: CardSuit.DIAMONDS, rank: CardRank.QUEEN },
  { suit: CardSuit.DIAMONDS, rank: CardRank.KING },
  { suit: CardSuit.DIAMONDS, rank: CardRank.ACE },

  // All hearts
  { suit: CardSuit.HEARTS, rank: CardRank.TWO },
  { suit: CardSuit.HEARTS, rank: CardRank.THREE },
  { suit: CardSuit.HEARTS, rank: CardRank.FOUR },
  { suit: CardSuit.HEARTS, rank: CardRank.FIVE },
  { suit: CardSuit.HEARTS, rank: CardRank.SIX },
  { suit: CardSuit.HEARTS, rank: CardRank.SEVEN },
  { suit: CardSuit.HEARTS, rank: CardRank.EIGHT },
  { suit: CardSuit.HEARTS, rank: CardRank.NINE },
  { suit: CardSuit.HEARTS, rank: CardRank.TEN },
  { suit: CardSuit.HEARTS, rank: CardRank.JACK },
  { suit: CardSuit.HEARTS, rank: CardRank.QUEEN },
  { suit: CardSuit.HEARTS, rank: CardRank.KING },
  { suit: CardSuit.HEARTS, rank: CardRank.ACE },

  // All spades
  { suit: CardSuit.SPADES, rank: CardRank.TWO },
  { suit: CardSuit.SPADES, rank: CardRank.THREE },
  { suit: CardSuit.SPADES, rank: CardRank.FOUR },
  { suit: CardSuit.SPADES, rank: CardRank.FIVE },
  { suit: CardSuit.SPADES, rank: CardRank.SIX },
  { suit: CardSuit.SPADES, rank: CardRank.SEVEN },
  { suit: CardSuit.SPADES, rank: CardRank.EIGHT },
  { suit: CardSuit.SPADES, rank: CardRank.NINE },
  { suit: CardSuit.SPADES, rank: CardRank.TEN },
  { suit: CardSuit.SPADES, rank: CardRank.JACK },
  { suit: CardSuit.SPADES, rank: CardRank.QUEEN },
  { suit: CardSuit.SPADES, rank: CardRank.KING },
  { suit: CardSuit.SPADES, rank: CardRank.ACE },
]

export class Deck {
  // The cards in the deck
  cards: Card[];

  /**
   * Creates a new deck
   * @param initial The ranks of the cards to put in the deck
   * @param shuffle Whether to shuffle the cards once the deck is created
   */
  constructor(initial?: Card[], shuffle?: boolean) {
    this.cards = initial || [];
    if (shuffle) shuffleArray(this.cards);
  }

  /**
   * Draws the card from the top of the deck
   * @returns A card from the deck, if there are any
   */
  draw() {
    return this.cards.pop();
  }
}

export const cardToString = (card: Card): string => {
  let result = '';

  if (card.rank === CardRank.NULL) {
    result += 'X';
  }
  // If the card has a numerical rank, just use that
  else if (card.rank < CardRank.JACK) {
    result += `${card.rank + 1}`;
  }
  else if (card.rank === CardRank.JACK) {
    result += `J`
  }
  else if (card.rank === CardRank.QUEEN) {
    result += `Q`
  }
  else if (card.rank === CardRank.KING) {
    result += `K`
  }
  else if (card.rank === CardRank.ACE) {
    result += `A`
  }
  else {
    result += `X`;
  }

  // Add the suit
  if (card.suit === CardSuit.CLUBS) {
    result += `c`;
  }
  else if (card.suit === CardSuit.DIAMONDS) {
    result += `d`;
  }
  else if (card.suit === CardSuit.HEARTS) {
    result += `h`;
  }
  else if (card.suit === CardSuit.SPADES) {
    result += `s`;
  }
  else {
    result += `x`;
  }

  return result;
}