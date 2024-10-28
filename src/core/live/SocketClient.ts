import { Server, Socket } from 'socket.io';

import { HydratedDocument } from 'mongoose'
import { UserData } from '../db/schemas/User.model';

export class SocketClient {
  // The Socket.IO server object controlled by the parent Server class
  io: Server;

  // The socket object controlling the client's connection
  socket: Socket;
  // The user the client has authenticated as
  user: HydratedDocument<UserData>;

  /**
   * Hydrates the client object post-authentication
   * @param io The Socket.IO server object controlled by the parent Server class
   * @param socket The socket object controlling the client's connection
   * @param user The user the client has authenticated as
   */
  constructor(io: Server, socket: Socket, user: HydratedDocument<UserData>) {
    // Set the client information
    this.io = io;
    this.socket = socket;
    this.user = user;

    this.createEventHandlers();
  }

  /**
   * Hooks the event handler methods into Socket.IO's event system
   */
  createEventHandlers() {

  }
}