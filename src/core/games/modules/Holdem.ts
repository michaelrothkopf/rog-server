/*
TODO:

- Ready system
- Multi-round host controls
- League interfacing?
  - Persistent player money within leagues/clubs?

*/

import { logger } from '../../../utils/logger';
import { SocketClient } from '../../live/SocketClient';
import { Game, BasePlayerData, GameConfig } from '../Game';
import { createWait, createWaitUntilTimeout, TimerState } from '../wait';

// Imports for working with cards
import { Card, Deck, NULL_CARD, shuffleArray, STANDARD_DECK } from './common/cards';
import { getWinners } from './common/poker';

const STARTING_MONEY = 200;
const BIG_BLIND = 2;
const SMALL_BLIND = BIG_BLIND / 2;
const BET_LIMIT = BIG_BLIND * 5;

// The time after the server sends a bet message for the clients to display the bet before the server sends the next bet request
const BET_DISPLAY_TIME = 500; // ms
// How long the player has to send a bet to the server before the player folds
const AUTOMATIC_FOLD_TIME = 15 * 1000; // ms
// How long the server will wait between rounds for the client to animate river population
const BET_ROUND_WAIT_TIME = 5 * 1000; // ms
// How long the server will wait between rounds of the game
const BETWEEN_ROUND_DELAY = 2 * 1000; // ms

const N_ROUNDS = 3;

export const HOLDEM_GAME_CONFIG: GameConfig<HoldemPlayerData> = {
  gameId: 'HOLDEM',
  friendlyName: 'Holdem',
  minPlayers: 3,
  maxPlayers: 10,
  canJoinAfterBegin: true,
  canLeaveAfterBegin: true,
  
  defaultPlayerData: {
    // Boilerplate; displayName is always handled by Game.ts's addPlayer function and the Gamemanager
    displayName: '',

    // Players start with STARTING_MONEY
    money: STARTING_MONEY,
    // Players have bet no money
    bet: 0,
    // Players are unasked
    beenAsked: false,
    // Players have no wins
    wins: 0,
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
  // The amount of money the player has bet in a given round
  bet: number,
  // Whether a player has been prompted for a bet in a given round
  beenAsked: boolean,
  // The amount of rounds the player has won
  wins: number, 

  // The cards the player is currently holding
  cards: Card[];

  /*
  The player's seat around the table.

  / - - - - - - - - - \
  |   0   1   2   3    |
  |  9             4   |
  |   8   7   6   5    |
  \ - - - - - - - - - /
  */
  seat: number;

  // Whether the player has folded
  hasFolded: boolean;
}

// The current round stage
enum RoundStage {
  LOBBY,
  BETTING,
  PREFLOP,
  FLOP,
  TURN,
  RIVER,
  SHOWDOWN
}

// The different ways a player can bet
enum BettingAction {
  CHECK,
  CALL,
  RAISE,
  FOLD
}

export class Holdem extends Game<HoldemPlayerData> {
  // The current round number
  currentRound: number = 0;
  currentRoundStage: RoundStage = RoundStage.LOBBY;
  
  // The players who are playing in the current round (whether they have folded or not)
  roundPlayers: string[] = [];
  // Whether the currently asked player has betted
  askedHasBet: TimerState = { pass: false };

  // The deck which the table is playing with
  deck: Deck = new Deck();
  // The river
  river: Card[] = [];
  // The current money pot
  pot: number = 0;
  // Betting state from player messages (must be raised so the listener can communicate with the betting loop)
  askedUserId: string = '';
  askedAction: BettingAction = 0;
  askedAmount: number = 0;
  // The different positions' seat IDs
  dealer: number = 0;
  smallBlind: number = 1;
  bigBlind: number = 2;

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

    // Assign the players permanent seats to track their table position
    this.assignSeats();

    // Run each round in succession
    for (let i = 0; i < N_ROUNDS; i++) {
      await this.playRound();
      // Delay between rounds to give clients time to display winner
      await createWait(BETWEEN_ROUND_DELAY);
    }
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {
    // When the player submits a bet
    client.socket.on('holdemBetResponse', (payload) => {
      if (userId === this.askedUserId) {
        this.handleBetResponse(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: not currently accepting bets from this player',
        });
      }
    });
  }

  /**
   * Assigns each player a random seat at the table
   */
  assignSeats() {
    // Create the seat pool
    let seatPool: number[] = [];
    for (let i = 0; i < this.players.size; i++) seatPool.push(i);
    // Shuffle the seat pool
    shuffleArray(seatPool);

    // For each player
    for (const [uid, p] of this.players) {
      // Assign the player the top index from the shuffled pool of indices
      const seat = seatPool.pop();
      if (seat === undefined) {
        p.seat = -1;
      }
      else {
        p.seat = seat;
      }
      // Send the player their seat
      this.sendOne(uid, 'holdemSeat', {
        userId: uid,
        seat: p.seat,
      });
    }
  }

  /**
   * Runs a round of poker
   */
  async playRound() {
    // Update server state
    this.currentRound++;
    this.currentRoundStage = RoundStage.PREFLOP;

    // Prepare the state for the round
    this.prepareRound();

    // Tell the clients that the round is beginning and give them the relevant information
    this.announceRoundBeginning();
    
    // Perform the round stages in order
    await this.doPreflop();
    await createWait(BET_ROUND_WAIT_TIME);
    // Check for winner when performing the bet round
    let winner = await this.doBetting(true);
    if (winner) return this.finishRound([winner]);

    await this.doFlop();
    await createWait(BET_ROUND_WAIT_TIME);
    winner = await this.doBetting(false);
    if (winner) return this.finishRound([winner]);

    await this.doTurn();
    await createWait(BET_ROUND_WAIT_TIME);
    winner = await this.doBetting(false);
    if (winner) return this.finishRound([winner]);

    await this.doRiver();
    await createWait(BET_ROUND_WAIT_TIME);
    winner = await this.doBetting(false);
    if (winner) return this.finishRound([winner]);

    await createWait(BET_ROUND_WAIT_TIME);
    await this.doShowdown();
  }

  /**
   * Resets all round-lifespan data
   */
  prepareRound() {
    // Create a new deck and shuffle it
    this.deck = new Deck(STANDARD_DECK, true);
    // Reset the pot
    this.pot = 0;

    // Reset the player data
    for (const [uid, p] of this.players) {
      // Draw two cards
      let first = this.deck.draw();
      let second = this.deck.draw();
      // We were unable to draw cards, throw an error
      if (!first || !second) {
        logger.error(`[HOLDEM] Drew one or more null cards while preparing the round`);
        throw new Error();
      }
      // Populate the hole cards
      p.cards = [first, second];
      // Reset the other player data
      p.hasFolded = false;
    }

    // Update the seat position values
    this.dealer++;
    if (this.dealer >= this.players.size) this.dealer = 0;
    this.smallBlind = this.dealer + 1;
    if (this.smallBlind >= this.players.size) this.smallBlind = 0;
    this.bigBlind = this.smallBlind + 1;
    if (this.bigBlind >= this.players.size) this.bigBlind = 0;

    // Get an array of the player objects in the order they sit around the table
    const playersInOrder = [...Array.from(this.players.keys()).sort((a, b) => (this.players.get(a)?.seat || -1) - (this.players.get(b)?.seat || -1))];
    // Starting at the small blind (where betting starts for the majority of rounds), populate the active players in betting order
    this.roundPlayers = [];
    for (let i = this.smallBlind; i < playersInOrder.length; i++) {
      this.roundPlayers.push(playersInOrder[i]);
    }
    // Add the players sitting in the seats before the dealer (in clockwise order starting from zero)
    for (let i = 0; i < this.smallBlind; i++) {
      this.roundPlayers.push(playersInOrder[i]);
    }

    // Reset the river to be empty
    this.river = [];
  }

  announceRoundBeginning() {
    // Send the relevant information to the clients
    this.sendAll('holdemRoundBegin', {
      // Send a list of all players as HoldemPlayerData objects
      roundPlayers: this.getClientPlayers(),
      // Send the placement information
      dealer: this.dealer,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
    });
  }

  /**
   * Performs a round of betting, waiting on each client to check, call, raise, or fold until all active players have bet the same amount
   * @param preFlop Whether the betting is taking place preflop
   */
  async doBetting(preFlop?: boolean): Promise<string | undefined> {
    // Set all players' bet amounts to zero and states to unasked as a new round of betting has started
    for (const userId of this.roundPlayers) {
      // Get the player
      const p = this.players.get(userId);
      if (!p) continue;
      p.bet = 0;
      p.beenAsked = false;
    }

    // The total amount raised; i.e. the amount each player needs to bet to remain in
    let roundTotal: number = 0;

    // Checks whether the round of betting is over
    const checkBettingComplete = (): boolean => {
      for (const userId of this.roundPlayers) {
        // Get the player
        const p = this.players.get(userId);
        if (!p) continue;

        // If a player has folded, status is irrelevant
        if (p.hasFolded) { logger.debug(`player ${p.displayName} has folded, ignoring`); continue};

        // If a player hasn't been asked, the round is not over
        if (!p.beenAsked) { logger.debug(`player ${p.displayName} has not been asked`); return false };

        // If a player hasn't bet the round total (and hasn't folded), the round is not over
        if (p.bet !== roundTotal) { logger.debug(`player ${p.displayName} has not bet the round total, ignoring`); return false; };
      }

      logger.debug(`All stop conditions have been met; betting is over`);
      // All stop conditions are met and the round is over
      return true;
    }

    // While the round of betting is incomplete, loop through roundPlayers, asking each player for a bet
    let i = -1;
    while (!checkBettingComplete()) {
      // Select the next player
      i++;
      if (i >= this.roundPlayers.length) i = 0;

      // Wait a little bit to give clients time to display the animations
      await createWait(BET_DISPLAY_TIME);

      // Get the player
      let userId = this.roundPlayers[i];
      const p = this.players.get(userId);
      if (!p) continue;

      logger.debug(`Doing betting for ${p.displayName}; fold: ${p.hasFolded}, Bet: $${p.bet}, round total: ${roundTotal}`);

      // If the player has folded, do nothing with the turn
      if (p.hasFolded) continue;

      // Send the updated betting turn to the players
      this.sendAll('holdemBettingTurn', {
        turn: p.seat,
      });

      // Block receiving bets until the server is ready
      this.askedUserId = '';

      // The player's betting action
      this.askedAction = BettingAction.FOLD;
      this.askedAmount = 0;
      // The amount the player must pay to call, equal to the total amount each player must pay to stay in the round minus the amount the player has already bet
      const callAmount = roundTotal - p.bet;

      // If the player is blinded, we are preflop, and it is the first time around, they must bet
      if (preFlop && (!p.beenAsked) && (p.seat === this.smallBlind || p.seat === this.bigBlind)) {
        this.askedAction = BettingAction.RAISE;
        this.askedAmount = p.seat === this.smallBlind ? SMALL_BLIND : BIG_BLIND;
      }
      // Otherwise, wait for the player to make their bet
      else {
        // Now allow receiving bets for this player
        this.askedUserId = userId;
        // Send the player a bet request
        this.sendOne(userId, 'holdemBetRequest', {
          roundTotal,
          bet: p.bet,
          callAmount,
          money: p.money,
          bettingOver: Date.now() + AUTOMATIC_FOLD_TIME,
          // Include only those actions the player is permitted to perform at the moment
          bettingActions: [
            // Check if pot is closed
            callAmount === 0 ? BettingAction.CHECK : BettingAction.FOLD,
            // Call if enough money
            (p.money >= callAmount && callAmount !== 0) ? BettingAction.CALL : BettingAction.FOLD,
            // Raise if more than enough money
            p.money > callAmount ? BettingAction.RAISE : BettingAction.FOLD,
            // Always fold
            BettingAction.FOLD,
          ],
        });
        // Wait until the player has responded or timed out
        await createWaitUntilTimeout(this.askedHasBet, AUTOMATIC_FOLD_TIME, () => {}, true, true);
      }

      // Mark the player as having been asked for a bet
      p.beenAsked = true;

      logger.debug(`player ${p.displayName} has made bet:\nAC: ${this.askedAction}, AA: $${this.askedAmount}, BA: ${p.beenAsked}\nRT: $${roundTotal}, CA: $${callAmount}`);

      // Block receiving bets
      this.askedUserId = '';

      // The player has made their bet, process it
      // @ts-ignore -- because this value is set by an outside method, TypeScript thinks it will always be RAISE or FOLD
      if (this.askedAction === BettingAction.CHECK) {
        // The player cannot check if the round total is greater than zero; if it isn't, confirm the bet
        if (roundTotal === 0) {
          this.sendAll('holdemBettingAction', {
            roundPlayers: this.getClientPlayers(),
            pot: this.pot,
            displayName: p.displayName,
            action: this.askedAction,
            amount: 0,
          });
          continue;
        }
      }
      // @ts-ignore -- because this value is set by an outside method, TypeScript thinks it will always be RAISE or FOLD
      else if (this.askedAction === BettingAction.CALL) {
        // Make sure the player has enough money to call; if so, confirm the bet
        if (p.money >= callAmount) {
          // Charge the player's money and add it to their betting total for the round
          p.money -= callAmount;
          p.bet += callAmount;
          this.pot += callAmount;
          // Notify the clients
          this.sendAll('holdemBettingAction', {
            roundPlayers: this.getClientPlayers(),
            pot: this.pot,
            displayName: p.displayName,
            action: this.askedAction,
            amount: callAmount,
          });
          continue;
        }
      }
      else if (this.askedAction === BettingAction.RAISE) {
        // Make sure the player has enough money to perform the given raise and that the raise is more than the call amount and that the raise is within the limit; if so, confirm the bet
        if (this.askedAmount > callAmount && p.money >= this.askedAmount && this.askedAmount <= BET_LIMIT) {
          // Update the round total to the player's raise amount (how much the player pays minus how much the player would've paid to call)
          roundTotal += this.askedAmount - callAmount;
          // Charge the player's money and add it to their betting total for the round
          p.money -= this.askedAmount;
          p.bet += this.askedAmount;
          this.pot += this.askedAmount;
          // Notify the clients
          this.sendAll('holdemBettingAction', {
            roundPlayers: this.getClientPlayers(),
            pot: this.pot,
            displayName: p.displayName,
            action: this.askedAction,
            amount: this.askedAmount,
          });
          continue;
        }
      }
      // If we have reached this point, the player will fold (either by choice or by invalid message, i.e. evidence of attempted cheating)
      p.hasFolded = true;
      this.sendAll('holdemBettingAction', {
        roundPlayers: this.getClientPlayers(),
        pot: this.pot,
        displayName: p.displayName,
        action: BettingAction.FOLD,
        amount: 0,
      });

      // If all players except one have folded, end the game
      let notFolded = Array.from(this.players.entries()).filter(p => !p[1].hasFolded).map(p => p[0]);
      if (notFolded.length === 1) {
        logger.debug(`All have folded. Winner: ${notFolded[0]}`);
        return notFolded[0];
      }
      logger.debug(`NFL: ${notFolded.length}, NF: ${JSON.stringify(notFolded)}`);

      continue;
    }

    // There are at least two people still competing, return no user ID of a winner
    return undefined;
  }

  async handleBetResponse(userId: string, client: SocketClient, payload: any) {
    // If the bet payload didn't specify an action, or the action wasn't valid
    if (!('action' in payload) || !(typeof payload.action === 'number')) {
      // Automatically fold
      this.askedAction = BettingAction.FOLD;
      this.askedAmount = 0;
      this.askedHasBet.pass = true;
      return;
    }
    // At this point, the action is a number; if the action is invalid, the betting loop will catch it and fold
    this.askedAction = payload.action;
    // If the action specified an amount
    if (('amount' in payload) && (typeof payload.amount === 'number')) {
      this.askedAmount = payload.amount;
    }
    // Pass control off to the betting loop
    this.askedHasBet.pass = true;
    return;
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
  }

  async doFlop() {
    // Update the server state
    this.currentRoundStage = RoundStage.FLOP;

    // Populate the flop
    for (let i = 0; i < 3; i++) {
      // Attempt to draw a card
      let card = this.deck.draw();
      if (!card) {
        logger.error(`[HOLDEM] Drew one or more null cards while populating the river`);
        throw new Error();
      }
      // Add the card to the river
      this.river.push(card);
    }

    // Send all the players the new river
    this.sendAll('holdemRiverUpdate', {
      stage: this.currentRoundStage,
      river: this.river,
    });
  }

  async doTurn() {
    // Update the server state
    this.currentRoundStage = RoundStage.TURN;

    // Attempt to draw a card
    let card = this.deck.draw();
    if (!card) {
      logger.error(`[HOLDEM] Drew one or more null cards while populating the river`);
      throw new Error();
    }
    // Add it to the river
    this.river.push(card);

    // Send all the players the new river
    this.sendAll('holdemRiverUpdate', {
      stage: this.currentRoundStage,
      river: this.river,
    });
  }

  async doRiver() {
    // Update the server state
    this.currentRoundStage = RoundStage.RIVER;

    // Attempt to draw a card
    let card = this.deck.draw();
    if (!card) {
      logger.error(`[HOLDEM] Drew one or more null cards while populating the river`);
      throw new Error();
    }
    // Add it to the river
    this.river.push(card);

    // Send all the players the new river
    this.sendAll('holdemRiverUpdate', {
      stage: this.currentRoundStage,
      river: this.river,
    });
  }

  async doShowdown() {
    // Update the server state
    this.currentRoundStage = RoundStage.SHOWDOWN;

    // Create a map of players' user IDs to their cards
    const checkMap: Map<string, Card[]> = new Map();
    for (const [uid, p] of this.players) {
      if (p.hasFolded) continue;
      checkMap.set(uid, p.cards);
    }

    // Check the winners
    const winners = getWinners(this.river, checkMap);

    this.finishRound(winners);
  }

  /**
   * Finishes a round, splitting the pot between the provided winners
   * @param winners The user IDs of the winning players
   */
  finishRound(winners: string[]) {
    // Split the pot between the winners and create a list of winner display names
    const winnings = this.pot / winners.length;
    const winnerNames: string[] = [];
    for (const uid of winners) {
      // Get the player
      const p = this.players.get(uid);
      if (!p) continue;
      // Add the money
      p.money += winnings;
      // Add the player display name
      winnerNames.push(p.displayName);
    }

    // Send the results to the clients
    this.sendAll('holdemShowdownResult', {
      pot: this.pot,
      winnings,
      winnerNames,
      roundPlayers: this.getClientPlayers(),
    });
  }

  /**
   * Processes the player list into an array of client-safe HoldemPlayerData-esque objects
   * @returns An array with the client-safe data for all players in the game
   */
  getClientPlayers() {
    const clientPlayers: any[] = [];
    for (const p of this.players.values()) {
      clientPlayers.push({
        displayName: p.displayName,
        money: p.money,
        wins: p.wins,
        cards: [NULL_CARD, NULL_CARD],
        seat: p.seat,
        hasFolded: p.hasFolded,
      });
    }
    return clientPlayers;
  }
}