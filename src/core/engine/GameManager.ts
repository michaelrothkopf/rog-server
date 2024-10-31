import { BasePlayerData, Game } from './Game';

import { Hilar, HILAR_GAME_CONFIG } from './games/Hilar';

import { logger } from '../../utils/logger';
import { JoinCodeGenerator } from './JoinCodeGenerator';
import { SocketClient } from '../live/SocketClient';
import { SocketServer } from '../live/SocketServer';

// The available games to play (must be hard-coded to avoid janky for-loop file imports)
export const availableGames = [
  HILAR_GAME_CONFIG.friendlyName,
];

// The time players have between creating a game and starting it before the room is closed
const GAME_JOIN_TIMEOUT = 5 * 60 * 1000;

export class GameManager {
  activeGames: Map<string, Game<BasePlayerData>> = new Map();

  joinCodeGenerator: JoinCodeGenerator = new JoinCodeGenerator();

  constructor() {}

  /**
   * Attempts to join a game
   * @param joinCode The join code of the game to join
   * @param player The player attempting to join the game
   * @returns Whether the player successfully joined
   */
  async joinGame(joinCode: string, player: SocketClient): Promise<boolean> {
    // If the player is already in a game
    if (this.playerInGame(player.user._id.toString())) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'JOIN',
        message: 'Cannot join game; player is already in game',
      });
      return false;
    }

    const game = this.activeGames.get(joinCode);
    // If the game doesn't exist
    if (!game) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'JOIN',
        message: 'Game does not exist',
      });
      return false;
    }
    // If the game is full
    if (game.players.size >= game.gameConfig.maxPlayers) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'JOIN',
        message: 'Game is full',
      });
      return false;
    }
    
    // No errors, join the game
    game.addPlayer(player.user._id.toString(), player.user.username);

    return true;
  }

  /**
   * Attempts to begin a game
   * @param player The player attempting to begin the game
   * @returns Whether the game started
   */
  async beginGame(player: SocketClient): Promise<boolean> {
    const game = this.getPlayerGame(player.user._id.toString());
    // If the game doesn't exist
    if (!game) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'BEGIN',
        message: 'Game does not exist or player is not in a game',
      });
      return false;
    }
    // If the player is not the creator
    if (game.creatorId !== player.user._id.toString()) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'BEGIN',
        message: 'Player attempting to begin game is not creator',
      });
      return false;
    }
    // If the game is too small
    if (game.players.size < game.gameConfig.minPlayers) {
      // Send the player an error message
      player.socket.emit('gameError', {
        module: 'BEGIN',
        message: 'Game is too small',
      });
      return false;
    }

    game.beginGame();

    return true;
  }

  /**
   * Attempts to create a game
   * @param gameId The ID of the game
   * @param creator The user trying to create the game
   * @param server The SocketServer the game will associate with
   * @returns Whether the game was created successfully
   */
  async createGame(gameId: string, creator: SocketClient, server: SocketServer): Promise<boolean> {
    // If the player is already in a game
    if (this.playerInGame(creator.user._id.toString())) {
      // Send the player an error message
      creator.socket.emit('gameError', {
        module: 'JOIN',
        message: 'Cannot join game; player is already in game',
      });
      return false;
    }

    const joinCode = this.joinCodeGenerator.generateCode();
    let game;

    // Select the game from the available games
    if (gameId === 'HILAR') {
      game = new Hilar(joinCode, creator.user._id.toString(), server);
    }
    else {
      creator.socket.emit('gameError', {
        message: 'You did not select a valid game.',
      });
      return false;
    }

    // Send the game data to the creator
    creator.socket.emit('gameInfo', {
      gameId,
      joinCode,
    });

    // Add the player to the game
    this.joinGame(gameId, creator);

    // Set the join timeout to avoid 
    setTimeout(() => {
      // If the game has already begun, do nothing
      if (game.hasBegun) return;

      // If there aren't enough players
      if (game.players.size < game.gameConfig.minPlayers) {
        // Don't start the game
        game.sendAll('gameError', {
          message: `Not enough players in the game at timeout. Need ${game.gameConfig.minPlayers}, have ${game.players.size}.`,
        });
        // Cancel the game
        this.destroyGame(joinCode);
        return;
      }
      
      // Start the game with the current number of players
      game.beginGame();
    }, GAME_JOIN_TIMEOUT);

    return true;
  }

  /**
   * Destroys a game
   * @param joinCode The join code of the game to destroy
   */
  destroyGame(joinCode: string) {
    // Attempt to fetch the game
    const game = this.activeGames.get(joinCode);

    // If it doesn't exist, do nothing
    if (!game) return;

    // Send the game closure message
    game.sendAll('gameEnd', {
      message: 'The game has ended.',
    });
  }

  /**
   * Gets the game a player is currently in
   * @param userId The userId of the player
   * @returns The game the player is in or null if no game found
   */
  getPlayerGame(userId: string): Game<BasePlayerData> | null {
    this.activeGames.forEach((g) => {
      if (g.players.has(userId)) return g;
    });
    return null;
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