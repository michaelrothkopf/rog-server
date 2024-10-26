import { SocketClient } from './SocketClient';

import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import mongoose from 'mongoose';
import { authenticateUser, validateAuthenticationToken } from '../auth/auth';

export class SocketServer {
  // The Socket.IO server instance the class manages
  io: Server;
  // The clients the server represents
  clients: Map<string, SocketClient>;

  /**
   * Creates a new SocketServer instance from a given Socket.IO server instance
   * @param io The Socket.IO server instance the class manages
   */
  constructor(io: Server) {
    this.io = io;
    this.clients = new Map();

    this.createEventHandlers();
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
}