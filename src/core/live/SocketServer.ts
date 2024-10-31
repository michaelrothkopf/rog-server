import { SocketClient } from './SocketClient';

import { Server, Socket } from 'socket.io';
import { GameManager } from '../engine/GameManager';
import { v4 as uuidv4 } from 'uuid';

import mongoose from 'mongoose';
import { authenticateUser, validateAuthenticationToken } from '../auth/auth';
import { logger } from '../../utils/logger';

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

      // Respond to the client
      return socket.send('connEstablishRes', {
        success: true,
        user: {
          _id: authResult.user._id,
          username: authResult.user.username,
          email: authResult.user.email,
          locked: authResult.user.locked,
          lastLogin: authResult.user.lastLogout,
          lastLogout: authResult.user.lastLogout,
        }
      });
    }
    // The authentication was not successful, respond to the client
    return socket.send('connEstablishRes', {
      success: false,
      user: null,
    });
  }

  async createClientEventHandlers(client: SocketClient) {
    client.socket.on('createGame', async payload => {
      const result = await this.onCreateGame(client, payload);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) created a game of type ${payload.gameId}.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to create a game with payload ${payload}.`);
      }
    });

    client.socket.on('joinGame', async payload => {
      const result = await this.onJoinGame(client, payload);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) joined a game with code ${payload.joinCode}.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to join a game with payload ${payload}.`);
      }
    });

    client.socket.on('beginGame', async payload => {
      const result = await this.onJoinGame(client, payload);
      if (result) {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) began a game with code ${payload.joinCode}.`);
      }
      else {
        logger.debug(`User ${client.user._id.toString()} (${client.user.username}) failed to begin a game.`);
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
}