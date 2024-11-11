import path from 'path';
import { config } from '../../utils/config';

import { SocketServer } from '../live/SocketServer';
import { SocketClient } from '../live/SocketClient';

export const dataFolderPath = path.resolve(config.dataFolderPath);

export interface BasePlayerData {
  displayName: string;
}
export interface GameConfig<T_PlayerData extends BasePlayerData> {
  gameId: string;
  friendlyName: string;
  minPlayers: number;
  maxPlayers: number;
  defaultPlayerData: T_PlayerData;
}

export abstract class Game<T_PlayerData extends BasePlayerData> {
  joinCode: string;
  // Map from User._id (string) to T_PlayerData (game dependent)
  players: Map<string, T_PlayerData>;
  gameConfig: GameConfig<T_PlayerData>;
  socketServer: SocketServer;
  creatorId: string;

  hasBegun: boolean;

  /**
   * Creates a new abstract Game
   * @param joinCode The join code for the match
   * @param creatorId The user ID of the creator of the game
   * @param gameConfig The configuration for the game (constant across all instances of the same game)
   * @param socketServer The socket server the game is associated with
   */
  constructor(joinCode: string, creatorId: string, gameConfig: GameConfig<T_PlayerData>, socketServer: SocketServer) {
    this.joinCode = joinCode;
    this.players = new Map();
    this.creatorId = creatorId;

    this.gameConfig = gameConfig;

    this.socketServer = socketServer;

    this.hasBegun = false;
  }

  async beginGame(): Promise<any> {
    this.hasBegun = true;
    return await this.onBegin();
  }
  async onBegin(): Promise<any> {}

  /**
   * Adds a player to the game
   * @param userId The user ID of the user in string form
   * @param displayName The player's display name
   * @param [initialData=null] The initial data to pass to the player
   */
  addPlayer(userId: string, displayName: string, initialData: T_PlayerData | null = null): void {
    // If the player is already in the game, don't add again
    if (this.players.has(userId) || this.players.size >= this.gameConfig.maxPlayers) {
      return;
    }

    // If no initial data is passed, use the default
    if (initialData === null) {
      this.players.set(userId, this.gameConfig.defaultPlayerData);
    }
    else {
      this.players.set(userId, initialData);
    }
    
    // Really TypeScript I just set this value
    const p = this.players.get(userId);
    if (!p) return;
    p.displayName = displayName;

    const players = [];
    for (const [userId, userData] of this.players) {
      players.push({
        userId, displayName: userData.displayName
      });
    }
    // Broadcast the new list of players
    this.sendAll('gamePlayers', {
      players,
    });
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
   * @param event The event name to send the data under
   * @param args The arguments to pass to the emit function
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