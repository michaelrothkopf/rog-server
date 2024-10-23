import { dataFolderPath, Game } from '../Game';
import fs from 'fs';
import path from 'path';

const GAME_ID = `HILAR`;
const questionSetUnfriendly = fs.readFileSync(path.join(dataFolderPath, 'hilar', 'QS1U.txt')).toString().split(/\r?\n/);

console.log(questionSetUnfriendly);

export class Hilar extends Game {
  /**
   * Creates a new Hilar game instance
   * @param joinCode The join code for this match
   */
  constructor(joinCode: string) {
    super(joinCode, GAME_ID);
  }

  /**
   * Adds a player to the game
   * @param userId The user ID of the user in string form
   */
  addPlayer(userId: string) {
    // Override to change default user data
    this.players.set(userId, {
      score: 0,
    });
  }
}