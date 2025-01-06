import { SocketClient } from '../../live/SocketClient';
import { Game, BasePlayerData, GameConfig } from '../Game';

export const CHAT_GAME_CONFIG: GameConfig<ChatPlayerData> = {
  gameId: 'CHAT',
  friendlyName: 'Chat',
  minPlayers: 1,
  maxPlayers: 32,
  canJoinAfterBegin: true,
  canLeaveAfterBegin: true,
  
  defaultPlayerData: {
    // Boilerplate; displayName is always handled by Game.ts's addPlayer function and the Gamemanager
    displayName: '',
  },
};

export interface ChatPlayerData extends BasePlayerData {
  // No extra player data necessary for Chat
}

interface MessageData {
  sender: string;
  content: string;
  timestamp: number;
}

export class Chat extends Game<ChatPlayerData> {
  messages: MessageData[] = [];

  /**
   * Creates a new Chat game instance
   * @param joinCode The join code for this match
   * @param creatorId The user ID of the creator
   * @param getClient A function to get a client's SocketClient from the server
   */
  constructor(joinCode: string, creatorId: string, getClient: (id: string) => SocketClient | undefined, end: () => void) {
    super(joinCode, creatorId, CHAT_GAME_CONFIG, getClient, end);
  }

  async onBegin() {
    // Add the event handlers
    this.addAllHandlers();
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient) {
    // When the player enters a response to the question
    client.socket.on('chatMessage', (payload) => {
      this.handleMessage(userId, client, payload);
    });
  }

  /**
   * Handles a message
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload The payload containing the request data
   * @returns When the function terminates
   */
  handleMessage(userId: string, client: SocketClient, payload: any) {
    // If there is no or invalid message content
    if (typeof payload.content !== 'string') {
      client.socket.emit('gameError', {
        message: 'Client error: message content must be a string',
      });
      return;
    }

    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process message because you have been removed from the game.',
      });
      return;
    }

    // Create message data
    const message: MessageData = {
      sender: player.displayName,
      content: payload.content,
      timestamp: Date.now(),
    };

    // Add the message to the array
    this.messages.push(message);

    // Send the message to all clients
    this.sendAll('chatNewMessage', message);
  }
}