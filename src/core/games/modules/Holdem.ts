import { SocketClient } from '../../live/SocketClient';
import { Game, BasePlayerData, GameConfig } from '../Game';

// Imports for working with cards
import { Card, Deck, NULL_CARD, STANDARD_DECK } from './common/cards';

const STARTING_MONEY = 1000;
const N_ROUNDS = 3;

export const HOLDEM_GAME_CONFIG: GameConfig<HoldemPlayerData> = {
  gameId: 'HOLDEM',
  friendlyName: 'Holdem',
  minPlayers: 1,
  maxPlayers: 32,
  canJoinAfterBegin: true,
  canLeaveAfterBegin: true,
  
  defaultPlayerData: {
    // Boilerplate; displayName is always handled by Game.ts's addPlayer function and the Gamemanager
    displayName: '',

    // Players start with STARTING_MONEY
    money: STARTING_MONEY,
    // Players start with no cards
    cards: [],
    // Players are all sitting in position zero before the round starts
    seat: 0,
    // Nobody has folded
    hasFolded: false,
  },
};

export interface HoldemPlayerData extends BasePlayerData {
  // The amount of money the player has to bet
  money: number;

  // The cards the player is currently holding
  cards: Card[];

  /*
  The player's seat around the table.

  / - - - - - - - - \
  |  0   1   2   3   |
  |  9           4   |
  |  8   7   6   5   |
  \ - - - - - - - - /
  */
  seat: number;

  // Whether the player has folded
  hasFolded: boolean;
}

// The current round stage
enum RoundStage {
  LOBBY,
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
  SHOWDOWN
}

export class Holdem extends Game<HoldemPlayerData> {
  // The current round number
  currentRound: number = 0;
  currentRoundStage: RoundStage = RoundStage.LOBBY;

  // The deck which the table is playing with
  deck: Deck = new Deck();
  // The current money pool
  pool: number = 0;

  /**
   * Creates a new Holdem game instance
   * @param joinCode The join code for this match
   * @param creatorId The user ID of the creator
   * @param getClient A function to get a client's SocketClient from the server
   */
  constructor(joinCode: string, creatorId: string, getClient: (id: string) => SocketClient | undefined, end: () => void) {
    super(joinCode, creatorId, HOLDEM_GAME_CONFIG, getClient, end);
  }

  async onBegin() {
    // Add the event handlers
    this.addAllHandlers();

    // Run each round in succession
    for (let i = 0; i < N_ROUNDS; i++) {
      await this.playRound();
    }
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {
  }

  playRound() {
    // Update server state
    this.currentRound++;
    this.currentRoundStage = RoundStage.PREFLOP;

    // Prepare the state for the round
    this.prepareRound();
    
    // Perform the round stages in order
  }

  /**
   * Resets all round-lifespan data
   */
  prepareRound() {
    // Create a new deck and shuffle it
    this.deck = new Deck(STANDARD_DECK, true);
    // Reset the pool
    this.pool = 0;

    let idx = 0;
    // Reset the player data
    for (const [uid, p] of this.players) {
      // Populate the hole cards
      p.cards = [this.deck.draw() || NULL_CARD, this.deck.draw() || NULL_CARD];
      // Reset the other player data
      p.hasFolded = false;
      p.seat = idx;

      idx++;
    }
  }

  async doPreflop() {
    // Update the server state
    this.currentRoundStage = RoundStage.PREFLOP;

    // Send the all players their hole cards
    for (const [uid, p] of this.players) {
      this.sendOne(uid, 'holdemHoleCards', {
        cards: p.cards,
      });
    }

    // Await betting before returning
  }
}