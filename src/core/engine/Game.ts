import path from 'path';
import { config } from '../../utils/config';

import { SocketServer } from '../live/SocketServer';
import { SocketClient } from '../live/SocketClient';

export const dataFolderPath = path.resolve(config.dataFolderPath);

export interface BasePlayerData {}
export interface GameConfig<T_PlayerData> {
  gameId: string;
  maxPlayers: number;
  defaultPlayerData: T_PlayerData;
}

export abstract class Game<T_PlayerData extends BasePlayerData> {
  joinCode: string;
  // Map from User._id (string) to T_PlayerData (game dependent)
  players: Map<string, T_PlayerData>;
  gameConfig: GameConfig<T_PlayerData>;
  socketServer: SocketServer;

  /**
   * Creates a new abstract Game
   * @param joinCode The join code for the match
   * @param gameConfig The configuration for the game (constant across all instances of the same game)
   */
  constructor(joinCode: string, gameConfig: GameConfig<T_PlayerData>, socketServer: SocketServer) {
    this.joinCode = joinCode;
    this.players = new Map();

    this.gameConfig = gameConfig;

    this.socketServer = socketServer;
  }

  async beginGame(): Promise<any> {}

  /**
   * Adds a player to the game
   * @param userId The user ID of the user in string form
   */
  addPlayer(userId: string, initialData: T_PlayerData | null = null): void {
    // If the player is already in the game, don't add again
    if (this.players.has(userId) || this.players.size >= this.gameConfig.maxPlayers) {
      return;
    }

    // If no initial data is passed, use the default
    if (initialData === null) {
      this.players.set(userId, this.gameConfig.defaultPlayerData);
      return;
    }

    this.players.set(userId, initialData);
  }

  /**
   * Removes a player from the game
   * @param userId The user ID of the user in string form
   */
  removePlayer(userId: string): void {
    if (this.players.has(userId)) {
      this.players.delete(userId);
    }
  }

  /**
   * Sends all players some data
   */
  sendAll(event: string, ...args: any[]) {
    for (const p of this.players) {
      // Get the client associated with the player and send it the questions
      const client = this.socketServer.clients.get(p[0]);
      if (!client) continue;
      client.socket.emit(event, args);
    }
  }

  /**
   * Adds handlers for all players in the game
   */
  addAllHandlers() {
    for (const p of this.players) {
      // Get the client associated with the player and call addHandlers for that client
      const client = this.socketServer.clients.get(p[0]);
      if (!client) continue;
      this.addHandlers(p[0], client);
    }
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {}
}