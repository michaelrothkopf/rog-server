import { dataFolderPath, Game, BasePlayerData, GameConfig } from '../Game';
import fs from 'fs';
import path from 'path';

import { SocketServer } from '../../live/SocketServer';
import { logger } from '../../../utils/logger';
import { SocketClient } from '../../live/SocketClient';

const questionSetUnfriendly = fs.readFileSync(path.join(dataFolderPath, 'hilar', 'QS1U.txt')).toString().split(/\r?\n/);

const QUESTION_ANSWER_TIME = 60 * 1000;
const VOTE_TIME = 10 * 1000;
const RESULT_DISPLAY_TIME = 3 * 1000;
const LEADERBOARD_TIME = 5 * 1000;

const POINTS_PER_RESPONSE = 50;
const ROUND_BONUS_POINTS = 50;
const N_ROUNDS = 3;

// Holds data related to user question responses
interface QuestionResponse {
  responseText: string;
  userId: string;
}

// The current round stage
enum RoundStage {
  LOAD,
  RESPOND,
  VOTE,
  RESULTS,
  LEADERBOARD
}

export const HILAR_GAME_CONFIG: GameConfig<HilarPlayerData> = {
  gameId: 'HILAR',
  friendlyName: 'Hilar',
  minPlayers: 2,
  maxPlayers: 8,
  defaultPlayerData: {
    // TODO LOW: Modify type management to avoid having to place displayName in all game subclasses
    // Boilerplate; displayName is always handled by Game.ts's addPlayer function and the Gamemanager
    displayName: '',

    score: 0,
    responses: [],
    questions: [],
    questionIndices: [],
    hasVoted: false,
  }
};

export interface HilarPlayerData extends BasePlayerData {
  score: number;
  responses: string[];
  questions: string[];
  questionIndices: number[];
  hasVoted: boolean;
}

export class Hilar extends Game<HilarPlayerData> {
  currentRound: number = 0;
  currentRoundStage: RoundStage = RoundStage.LOAD;
  currentQuestions: string[] = [];
  currentQuestionResponses: QuestionResponse[][] = [];

  currentQuestionVotes: number = 0;

  /**
   * Creates a new Hilar game instance
   * @param joinCode The join code for this match
   * @param creatorId The user ID of the creator
   * @param getClient A function to get a client's SocketClient from the server
   */
  constructor(joinCode: string, creatorId: string, getClient: (id: string) => SocketClient | undefined) {
    super(joinCode, creatorId, HILAR_GAME_CONFIG, getClient);
  }

  async onBegin() {
    // Set up the event handlers
    this.addAllHandlers();

    // Run each round in succession
    for (let i = 0; i < N_ROUNDS; i++) {
      await this.playRound();
    }
  }

  async playRound(): Promise<boolean> {
    this.currentRound++;
    this.currentRoundStage = RoundStage.LOAD;

    // Set up the round
    this.populateQuestions();
    this.assignQuestions();

    // Send the players their questions
    this.sendQuestions();

    this.currentRoundStage = RoundStage.RESPOND;

    // Wait QUESTION_ANSWER_TIME ms to proceed to voting
    await new Promise(resolve => setTimeout(resolve, QUESTION_ANSWER_TIME));

    this.currentRoundStage = RoundStage.LOAD;

    // For each question, send the question and await results
    for (let i = 0; i < this.currentQuestionResponses.length; i++) {
      const q = this.currentQuestionResponses[i];
      // Get the current question response
      const qResp = this.currentQuestionResponses[i];
      // If it doesn't exist, fail the game
      if (!qResp) {
        logger.error(`During Hilar game: question response for question ${q} not found. Aborting game with ${this.players.size} players.`);
        this.sendAll('gameError', {
          message: 'Unfortunately, due to a server error, the game has crashed. Please contact support if the issue persists.',
        });
        return false;
      }

      this.sendAll('hilarVoteQuestion', {
        prompt: q,
        // Send just the response text of each option (do not tell user who made response)
        options: qResp.map((r) => r.responseText),
      });

      this.currentRoundStage = RoundStage.VOTE;

      // Wait VOTE_TIME ms to proceed to results
      await new Promise(resolve => setTimeout(resolve, VOTE_TIME));

      this.currentRoundStage = RoundStage.LOAD;

      // Get the player data for the two players who responded and validate it
      const p1 = this.players.get(qResp[0].userId);
      const p2 = this.players.get(qResp[1].userId);
      if (!p1 || !p2) {
        this.sendAll('gameServerError', {
          message: `Internal server error: unassoicated player in game (${qResp[0].userId}, ${qResp[1].userId}).`,
        });
        return false;
      }

      // The first option won
      if (this.currentQuestionVotes < 0) {
        this.sendAll('hilarVoteResult', {
          winner: 1,
        });

        p1.score += POINTS_PER_RESPONSE + ROUND_BONUS_POINTS * this.currentRound;
      }
      else if (this.currentQuestionVotes > 0) {
        this.sendAll('hilarVoteResult', {
          winner: 2,
        });

        p2.score += POINTS_PER_RESPONSE + ROUND_BONUS_POINTS * this.currentRound;
      }
      // Tie
      else {
        this.sendAll('hilarVoteResult', {
          winner: 0
        });

        p1.score += Math.round((POINTS_PER_RESPONSE + ROUND_BONUS_POINTS * this.currentRound) / 2);
        p2.score += Math.round((POINTS_PER_RESPONSE + ROUND_BONUS_POINTS * this.currentRound) / 2);
      }

      this.currentRoundStage = RoundStage.RESULTS;

      // Wait RESULT_DISPLAY_TIME ms to proceed to next question
      await new Promise(resolve => setTimeout(resolve, RESULT_DISPLAY_TIME));
    }

    this.currentRoundStage = RoundStage.LEADERBOARD;

    // Send the round leaderboard to the players
    this.sendAll('hilarLeaderboard', {
      // Get the standings of the players sorted highest score first in format { userId: string, score: number }[]
      standings: Array.from(this.players.entries()).sort((a, b) => a[1].score - b[1].score).map(p => {
        return {
          userId: p[0],
          score: p[1].score,
        };
      }),
    });

    // Wait RESULT_DISPLAY_TIME ms to proceed to next round
    await new Promise(resolve => setTimeout(resolve, LEADERBOARD_TIME));

    return true;
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {
    // When the player enters a response to the question
    client.socket.on('hilarQuestionResponse', (payload) => {
      if (this.currentRoundStage === RoundStage.RESPOND) {
        this.handleQuestionResponse(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: not currently accepting question responses',
        });
      }
    });

    // When the player votes
    client.socket.on('hilarVote', (payload) => {
      if (this.currentRoundStage === RoundStage.VOTE) {
        this.handleVote(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: not currently accepting votes',
        });
      }
    })
  }

  /**
   * Handles a question response
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload The payload containing the request data
   * @returns When the function terminates
   */
  handleQuestionResponse(userId: string, client: SocketClient, payload: any) {
    // If there is no or invalid response text
    if (typeof payload.responseText !== 'string') {
      client.socket.emit('gameError', {
        message: 'Client error: response must be a string',
      });
      return;
    }

    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    player.responses.push(payload.responseText);

    // If this response is the first
    if (player.responses.length === 1) {
      // Assign it to the first question
      this.currentQuestionResponses[player.questionIndices[0]].push({
        responseText: payload.responseText,
        userId: userId,
      });
    }
    // If this response is the second
    else if (player.responses.length === 2) {
      // Assign it to the first question
      this.currentQuestionResponses[player.questionIndices[1]].push({
        responseText: payload.responseText,
        userId: userId,
      });
    }
    // There was an error
    else {
      client.socket.emit('gameError', {
        message: 'You have already responded to both questions.',
      });
      return;
    }
  }

  /**
   * Handles a vote
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload The payload containing the request data
   * @returns When the function terminates
   */
  handleVote(userId: string, client: SocketClient, payload: any) {
    // If there is no or invalid response text
    if (typeof payload.vote !== 'number' || !(payload.vote === -1 || payload.vote === 1)) {
      client.socket.emit('gameError', {
        message: 'Client error: vote must be either -1 or 1 as a number',
      });
      return;
    }

    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    // If the player has already voted
    if (player.hasVoted) {
      client.socket.emit('gameError', {
        message: 'Client error: you have already voted!',
      });
      return;
    }

    // Add to the current votes
    this.currentQuestionVotes += payload.vote;
  }

  /**
   * Picks random questions and fills the current round's questions with those questions
   */
  populateQuestions() {
    // Reset the current questions
    this.currentQuestions = [];
    // Reset the question responses
    this.currentQuestionResponses = [];
    // Copy the question set to avoid duplicating
    const qCopy = questionSetUnfriendly.map(x => x);
    for (let i = 0; i < this.players.size; i++) {
      const qText = qCopy.splice(Math.floor(Math.random() * qCopy.length), 1)[0];
      this.currentQuestions.push(qText);
      this.currentQuestionResponses.push([]);
    }
  }

  /**
   * Assigns the questions from the current pool to players randomly
   */
  assignQuestions() {
    // Create a pool with two indices for each question
    const pool: number[] = [];
    for (let i = 0; i < this.currentQuestions.length; i++) {
      pool.push(i, i);
    }
    for (const p of this.players.values()) {
      // Reset the player's questions
      p.questions = [];
      p.questionIndices = [];
      p.responses = [];
      
      // Pick a random first question from the pool
      const q1 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      // Pick a random second question from the pool, reshuffling until a unique question is received
      let q2: number;
      do {
        // Use q2 to store the index and check its value against q1
        q2 = Math.floor(Math.random() * pool.length);
      } while (pool[q2] === q1);
      // Set q2 to the actual question index from the pool
      q2 = pool.splice(q2, 1)[0];

      // Push the new prompt strings to the array
      p.questions.push(this.currentQuestions[q1]);
      p.questions.push(this.currentQuestions[q2]);

      // Push the indices to the server-side player data
      p.questionIndices.push(q1);
      p.questionIndices.push(q2);
    }
  }

  /**
   * Sends the players their associated questions
   */
  sendQuestions() {
    logger.debug(`Sending questions to players`);
    for (const [uid, p] of this.players) {
      // Get the client associated with the player and send it the questions
      const client = this.getClient(uid);
      if (!client) continue;
      logger.debug(`Sending questions to player ${p.displayName}`);
      client.socket.emit('hilarQuestions', p.questions);
    }
  }
}