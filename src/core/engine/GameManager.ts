import { BasePlayerData, Game } from './Game';
import { SocketServer } from '../live/SocketServer';

import { Hilar, HILAR_GAME_CONFIG } from './games/Hilar';

import { logger } from '../../utils/logger';
import { JoinCodeGenerator } from './JoinCodeGenerator';
import { SocketClient } from '../live/SocketClient';

// The available games to play (must be hard-coded to avoid janky for-loop file imports)
export const availableGames = [
  HILAR_GAME_CONFIG.friendlyName,
];

// The time players have between creating a game and starting it before the room is closed
const GAME_JOIN_TIMEOUT = 5 * 60 * 1000;

export class GameManager {
  socketServer: SocketServer;
  activeGames: Map<string, Game<BasePlayerData>> = new Map();

  joinCodeGenerator: JoinCodeGenerator = new JoinCodeGenerator();

  /**
   * Creates a new GameManager
   * @param socketServer The socket server to host the games on
   */
  constructor(socketServer: SocketServer) {
    this.socketServer = socketServer;
  }

  async hostGames() {

  }

  async createGame(gameId: string, creator: SocketClient) {
    const code = this.joinCodeGenerator.generateCode();
    let game;

    // If the game is a game
    if (gameId === 'HILAR') {
      game = new Hilar(code, this.socketServer);
    }
    else {
      creator.socket.emit('createGameError', {
        message: 'You did not select a valid game.',
      });
    }

  }

  /**
   * Checks if a player is already in an active game
   * @param userId The userId of the player to check
   * @returns Whether the player is currently in a game
   */
  playerInGame(userId: string): boolean {
    this.activeGames.forEach((g) => {
      if (g.players.has(userId)) return true;
    });
    return false;
  }
}