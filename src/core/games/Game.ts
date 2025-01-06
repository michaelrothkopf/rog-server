import path from 'path';
import { config } from '../../utils/config';

import { SocketServer } from '../live/SocketServer';
import { SocketClient } from '../live/SocketClient';
import { logger } from '../../utils/logger';

export const dataFolderPath = path.resolve(config.dataFolderPath);

export interface BasePlayerData {
  displayName: string;
}
export interface GameConfig<T_PlayerData extends BasePlayerData> {
  gameId: string;
  friendlyName: string;
  minPlayers: number;
  maxPlayers: number;
  canJoinAfterBegin: boolean;
  canLeaveAfterBegin: boolean;
  defaultPlayerData: T_PlayerData;
}

export abstract class Game<T_PlayerData extends BasePlayerData> {
  joinCode: string;
  // Map from User._id (string) to T_PlayerData (game dependent)
  players: Map<string, T_PlayerData>;
  gameConfig: GameConfig<T_PlayerData>;
  getClient: (id: string) => SocketClient | undefined;
  creatorId: string;

  hasBegun: boolean;
  end: () => void;

  /**
   * Creates a new abstract Game
   * @param joinCode The join code for the match
   * @param creatorId The user ID of the creator of the game
   * @param gameConfig The configuration for the game (constant across all instances of the same game)
   * @param getClient A function to get a client's SocketClient from the server
   */
  constructor(joinCode: string, creatorId: string, gameConfig: GameConfig<T_PlayerData>, getClient: (id: string) => SocketClient | undefined, end: () => void) {
    this.joinCode = joinCode;
    this.players = new Map();
    this.creatorId = creatorId;

    this.gameConfig = gameConfig;

    this.getClient = getClient;

    this.hasBegun = false;
    this.end = end;
  }

  async beginGame(): Promise<any> {
    this.hasBegun = true;
    this.sendAll('gameBegin');
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
      this.players.set(userId, {...this.gameConfig.defaultPlayerData});
    }
    else {
      this.players.set(userId, {...initialData});
    }
    
    // Really TypeScript I just set this value
    const p = this.players.get(userId);
    if (!p) return;
    p.displayName = displayName;
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
   * Sends the new list of players in the game to all clients
   */
  broadcastPlayers(): void {
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
   * Sends the new list of players in the game to all clients
   */
  sendPlayersTo(userId: string): void {
    const players = [];
    for (const [userId, userData] of this.players) {
      players.push({
        userId, displayName: userData.displayName
      });
    }
    // Broadcast the new list of players
    this.sendOne(userId, 'gamePlayers', {
      players,
    });
  }

  /**
   * Sends one player some data
   * @param userId The player to send the data to
   * @param event The event name to send the data under
   * @param args The arguments to pass to the emit function
   */
  sendOne(userId: string, event: string, ...args: any[]) {
    const client = this.getClient(userId);
    if (!client) return;
    client.socket.emit(event, ...args);
  }

  /**
   * Sends all players some data
   * @param event The event name to send the data under
   * @param args The arguments to pass to the emit function
   */
  sendAll(event: string, ...args: any[]) {
    for (const p of this.players) {
      // Get the client associated with the player and send it the questions
      const client = this.getClient(p[0]);
      if (!client) continue;
      client.socket.emit(event, ...args);
    }
  }

  /**
   * Adds handlers for all players in the game
   */
  addAllHandlers() {
    for (const [uid, p] of this.players.entries()) {
      // Get the client associated with the player and call addHandlers for that client
      const client = this.getClient(uid);
      if (!client) continue;
      this.addHandlers(uid, client);
    }
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {}
}