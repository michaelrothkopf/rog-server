import path from 'path';
import { config } from '../../utils/config';

export const dataFolderPath = path.resolve(config.dataFolderPath);

export abstract class Game {
  joinCode: string;
  players: Map<string, any>;
  gameId: string;

  /**
   * Creates a new abstract Game
   * @param joinCode The join code for the match
   * @param gameId The ID of the game being played
   */
  constructor(joinCode: string, gameId: string) {
    this.joinCode = joinCode;
    this.players = new Map();
    this.gameId = gameId;
  }

  /**
   * Checks if a player is in the game
   * @param userId The user ID of the user in string form
   */
  hasPlayer(userId: string) {
    return this.players.has(userId);
  }

  /**
   * Adds a player to the game
   * @param userId The user ID of the user in string form
   */
  addPlayer(userId: string) {
    this.players.set(userId, {});
  }

  /**
   * Removes a player from the game
   * @param userId The user ID of the user in string form
   */
  removePlayer(userId: string) {
    this.players.delete(userId);
  }
}