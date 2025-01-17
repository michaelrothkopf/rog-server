import { SocketClient } from './SocketClient';

import { Server, Socket } from 'socket.io';
import { GameManager } from '../games/GameManager';
import { v4 as uuidv4 } from 'uuid';

import mongoose from 'mongoose';
import { authenticateUser, validateAuthenticationToken } from '../auth/auth';
import { logger } from '../../utils/logger';
import { sanitizeUserData } from '../db/schemas/User.model';

export class SocketServer {
  // The Socket.IO server instance the class manages
  io: Server;
  // The clients the server represents
  clients: Map<string, SocketClient>;

  gameManager: GameManager;

  /**
   * Creates a new SocketServer instance from a given Socket.IO server instance
   * @param io The Socket.IO server instance the class manages
   */
  constructor(io: Server) {
    this.io = io;
    this.clients = new Map();

    this.createEventHandlers();
    this.gameManager = new GameManager();
  }

  /**
   * Creates the handlers for the global server
   */
  createEventHandlers() {
    this.io.on('connection', (socket) => this.handleNewConnection(socket));
  }

  /**
   * Handles a new connection to the server
   * @param socket The socket making the connection
   */
  async handleNewConnection(socket: Socket) {
    // If the new connection doesn't contain string username and string password
    if (!(typeof socket.handshake.auth.token === 'string')) {
      // Respond and break
      return socket.send('connEstablishRes', {
        success: false,
        user: null,
        message: 'No authentication token provided on connection.'
      });
    }

    // Attempt to authenticate the user
    const authResult = await validateAuthenticationToken(socket.handshake.auth.token);

    // If the authentication was successful
    if (authResult.success && authResult.user) {
      // Create a client for the connection
      const client = new SocketClient(this.io, socket, authResult.user);
      // Add the client to the client list
      this.clients.set(authResult.user._id.toString(), client);

      // Create the client event handlers
      this.createClientEventHandlers(client);

      // Update the user's last login
      authResult.user.lastLogin = new Date();
      authResult.user.save();

      // Confirm the connection to the client
      socket.send('connEstablishRes', {
        success: true,
        user: sanitizeUserData(authResult.user),
      });

      // If the client is in a game
      this.gameManager.attemptRejoin(client);

      // Break out here to avoid sending failure
      return;
    }
    // The authentication was not successful, respond to the client
    return socket.send('connEstablishRes', {
      success: false,
      user: null,
      message: authResult.message,
    });
  }

  async createClientEventHandlers(client: SocketClient) {
    // When the socket is to disconnect
    client.socket.once('disconnecting', (reason) => {
      // Mark the client as having logged out
      client.user.lastLogout = new Date();
      client.user.save();
    });

    // When the client tries to create a game
    client.socket.on('createGame', async payload => {
      // Call the respective handler function
      const result = await this.onCreateGame(client, payload);
      // If it was successful, log a success message
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) created a game of type ${payload.gameId}.`);
      }
      // Otherwise, debug log an error message
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to create a game with payload ${payload}.`);
      }
    });

    // When the client tries to join a game
    client.socket.on('joinGame', async payload => {
      const result = await this.onJoinGame(client, payload);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) joined a game with code ${payload.joinCode}.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to join a game with payload ${payload}.`);
      }
    });

    // When the client tries to begin a game
    client.socket.on('beginGame', async () => {
      const result = await this.onBeginGame(client);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) began a game.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to begin a game.`);
      }
    });

    // When the client tries to end a game
    client.socket.on('terminateGame', async () => {
      const result = await this.onTerminateGame(client);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) terminated a game.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to terminate a game.`);
      }
    });

    // When the client tries to leave a game
    client.socket.on('leaveGame', async () => {
      const result = await this.onLeaveGame(client);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) left a game.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to leave a game.`);
      }
    });
  }

  /**
   * Handles a request to create a game 
   * @returns 
   */
  async onCreateGame(client: SocketClient, payload: any): Promise<boolean> {
    if (typeof payload.gameId !== 'string') {
      return false;
    }

    return await this.gameManager.createGame(payload.gameId, client, this);
  }

  /**
   * Handles a request to join a game 
   * @returns Whether the game joined successfully
   */
  async onJoinGame(client: SocketClient, payload: any): Promise<boolean> {
    if (typeof payload.joinCode !== 'string') {
      return false;
    }

    return await this.gameManager.joinGame(payload.joinCode, client);
  }

  /**
   * Handles a request to begin a game 
   * @returns Whether the game began successfully
   */
  async onBeginGame(client: SocketClient): Promise<boolean> {
    return await this.gameManager.beginGame(client);
  }

  /**
   * Handles a request to terminate a game 
   * @returns Whether the game terminated successfully
   */
  async onTerminateGame(client: SocketClient): Promise<boolean> {
    return await this.gameManager.terminateGame(client);
  }

  /**
   * Handles a request to leave a game 
   * @returns Whether the user left the game
   */
  async onLeaveGame(client: SocketClient): Promise<boolean> {
    return await this.gameManager.leaveGame(client);
  }
}