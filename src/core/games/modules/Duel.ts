import { dataFolderPath, Game, BasePlayerData, GameConfig } from '../Game';
import { logger } from '../../../utils/logger';
import { SocketClient } from '../../live/SocketClient';
import { createPassableWait, createWait, createWaitUntil, createWaitUntilTimeout, TimerState } from '../wait';
import { clamp } from '../utils';
import { Body, Circle, System } from 'detect-collisions';
import { DuelMap, getRandomMap } from './duel/DuelMaps';

// The current round stage
enum RoundStage {
  MENU,
  BATTLE,
  RESULTS,
}

// 10 minutes to ready up or game is destroyed
const READY_UP_TIMEOUT = 10 * 60 * 1000;

// Game constants
const RESULTS_DELAY = 5000; // in ms
const STARTING_HEALTH = 100;

// Shot parameters
const SHOT_DAMAGE = 8;
const SHOT_DELAY = 100; // in ms
const SHOT_RANGE = 500;

// Size of the player hitbox (rectangular, centered around (xPos, yPos))
const PLAYER_RADIUS = 10;
const SHOT_PADDING_MULTIPLIER = 1.02;

// Movement parameters
const PLAYER_VELOCITY = 3;
const MOVE_DELAY = 10; // in ms

// Map parameters
const MAP_W = 750;
const MAP_H = 750;
const SPOS_2 = [[MAP_W * 0.25, MAP_H * 0.5], [MAP_W * 0.75, MAP_H * 0.5]];
const SPOS_4 = [
  [MAP_W * 0.25, MAP_H * 0.25],
  [MAP_W * 0.25, MAP_H * 0.75],
  [MAP_W * 0.75, MAP_H * 0.25],
  [MAP_W * 0.75, MAP_H * 0.75],
];

export const DUEL_GAME_CONFIG: GameConfig<DuelPlayerData> = {
  gameId: 'DUEL',
  friendlyName: 'Duel',
  minPlayers: 2,
  maxPlayers: 2,
  defaultPlayerData: {
    // TODO LOW: Modify type management to avoid having to place displayName in all game subclasses
    // Boilerplate; displayName is always handled by Game.ts's addPlayer function and the Gamemanager
    displayName: '',
  
    ready: false,
    health: STARTING_HEALTH,
    aimAngle: 0,
    lastMove: Date.now(),
    lastShot: Date.now(),
    physicsBody: new Circle({ x: 0, y: 0 }, 0),

    numShots: 0,
    numHits: 0,
    numWins: 0,
  }
};

export interface DuelPlayerData extends BasePlayerData {
  // Individual round player properties
  ready: boolean;
  health: number;
  aimAngle: number;
  lastMove: number;
  lastShot: number;
  physicsBody: Circle;

  // Multiround statistics
  numShots: number;
  numHits: number;
  numWins: number;
}

export class Duel extends Game<DuelPlayerData> {
  currentRound: number = 0;
  currentRoundStage: RoundStage = RoundStage.MENU;
  allReady: TimerState = { pass: false };
  roundOver: TimerState = { pass: false };
  winner: string = '';

  collisionSystem: System = new System();
  currentMap: DuelMap = getRandomMap();
  walls: Body[] = [];
  
  /**
   * Creates a new Duel game instance
   * @param joinCode The join code for this match
   * @param creatorId The user ID of the creator
   * @param getClient A function to get a client's SocketClient from the server
   */
  constructor(joinCode: string, creatorId: string, getClient: (id: string) => SocketClient | undefined, end: () => void) {
    super(joinCode, creatorId, DUEL_GAME_CONFIG, getClient, end);

    // Create the empty collision system
    this.collisionSystem = new System();
  }

  async onBegin() {
    // Set up all event handlers
    this.addAllHandlers();

    // Run the game loop
    while (true) {
      await this.playRound();
    }
  }

  async playRound(): Promise<boolean> {
    // Reset the round data for the beginning of the round
    this.currentRound++;
    this.currentRoundStage = RoundStage.MENU;
    this.allReady = { pass: false };
    this.roundOver = { pass: false };
    for (const p of this.players.values()) { p.ready = false; }
    this.collisionSystem = new System();

    // Broadcast the menu
    this.sendAll('duelMenu', {
      stats: this.getStats(),
    });
    this.sendReadyStateUpdate();
    // Wait until all players are ready or until too much time has passed
    await createWaitUntilTimeout(this.allReady, READY_UP_TIMEOUT, this.end);

    // Initialize the round
    this.initializeDuel();
    // Start the round
    this.sendAll('duelBegin', {
      walls: this.currentMap.polygons,
    });
    this.currentRoundStage = RoundStage.BATTLE;
    this.updateAllStates();
    // Wait until the round is over
    await createWaitUntil(this.roundOver);

    this.currentRoundStage = RoundStage.RESULTS;
    // Announce the results
    this.sendAll('duelResult', {
      winner: this.winner,
    });
    // Wait the delay
    await createWait(RESULTS_DELAY);

    return true;
  }

  /**
   * Adds game event handlers for a player
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  addHandlers(userId: string, client: SocketClient): void {
    // When the player readies up
    client.socket.on('duelReady', () => {
      if (this.currentRoundStage === RoundStage.MENU) {
        this.handleReadyUp(userId, client);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: not in menu screen',
        });
      }
    });

    // When the player moves
    client.socket.on('duelMove', (payload) => {
      if (this.currentRoundStage === RoundStage.BATTLE) {
        this.handlePlayerMovement(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: game not currently active',
        });
      }
    });

    // When the player shoots
    client.socket.on('duelShoot', (payload) => {
      if (this.currentRoundStage === RoundStage.BATTLE) {
        this.handlePlayerShoot(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: game not currently active',
        });
      }
    });

    // When the player aims
    client.socket.on('duelAim', (payload) => {
      if (this.currentRoundStage === RoundStage.BATTLE) {
        this.handlePlayerAim(userId, client, payload);
      } else {
        client.socket.emit('gameError', {
          message: 'Client error: game not currently active',
        });
      }
    });
  }

  /**
   * Marks a player as ready
   * @param userId The user ID of the user
   * @param client The client object for the user
   */
  handleReadyUp(userId: string, client: SocketClient) {
    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    // Mark the player as ready
    player.ready = true;

    // Update the ready state
    this.allReady.pass = this.checkReady();

    // Send clients the ready state
    this.sendReadyStateUpdate();
  }

  /**
   * Moves a player in a specific direction
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload Contains { directions: string[] } with movement directions
   */
  handlePlayerMovement(userId: string, client: SocketClient, payload: any) {
    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    // If the player can't move again yet
    if (Date.now() - player.lastMove < MOVE_DELAY) {
      return;
    }
    player.lastMove = Date.now();

    // If the directions are invalid
    const directions = payload.directions;
    if (!Array.isArray(directions) || directions.length < 1 || (typeof directions[0] !== 'string')) {
      client.socket.emit('gameError', {
        message: 'Invalid directions specified.',
      });
      return;
    }

    // Create a movement vector
    let mvx = 0;
    let mvy = 0;
    // Set the vector components based on the movement directionss
    if (directions.includes('right')) {
      mvx = 1;
    }
    if (directions.includes('up')) {
      mvy = 1;
    }
    if (directions.includes('left')) {
      mvx = -1;
    }
    if (directions.includes('down')) {
      mvy = -1;
    }
    // Set the angle based on the movement vector
    player.physicsBody.setAngle(Math.atan2(mvy, mvx));
    // Move the player in the specified direction
    player.physicsBody.setPosition(
      player.physicsBody.pos.x + PLAYER_VELOCITY * Math.cos(player.physicsBody.angle),
      player.physicsBody.pos.y + PLAYER_VELOCITY * Math.sin(player.physicsBody.angle),
    );
    // Prevent moving through other objects
    this.collisionSystem.separate();

    // Send the state update
    this.sendStateUpdate(userId, player);
  }

  /**
   * Shoots in a specific direction
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload Contains { direction: number } with shot direction in radians
   */
  handlePlayerShoot(userId: string, client: SocketClient, payload: any) {
    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    // If the player can't shoot again yet
    if (Date.now() - player.lastShot < SHOT_DELAY) {
      return;
    }
    player.lastShot = Date.now();

    // If the direction is invalid
    const direction = payload.direction;
    if (typeof direction !== 'number') {
      client.socket.emit('gameError', {
        message: 'Invalid aim direction specified. ' + direction,
      });
      return;
    }

    // Increase the shot statistic
    player.numShots++;

    // Fire the shot and get the resulting userId
    // Set the shot starting position to just outside the player's bounding box
    const startX = player.physicsBody.x + PLAYER_RADIUS * SHOT_PADDING_MULTIPLIER * Math.cos(direction);
    const startY = player.physicsBody.y - PLAYER_RADIUS * SHOT_PADDING_MULTIPLIER * Math.sin(direction);
    // Get the shot endpoints
    const endX = startX + SHOT_RANGE * Math.cos(direction);
    const endY = startY - SHOT_RANGE * Math.sin(direction);

    // logger.debug(`Shot fired: position: (${player.physicsBody.x}, ${player.physicsBody.y}), direction: ${direction} rad (${direction * 180 / Math.PI} deg), start: (${startX}, ${startY}), end: (${endX}, ${endY})`);

    // Get the raycast collision result
    const hit = this.collisionSystem.raycast(
      { x: startX, y: startY },
      { x: endX, y: endY },
    );
    // If the shot hit a player
    if (hit && 'userId' in hit.body.userData) {
      // Get the target Player
      const target = this.players.get(hit.body.userData.userId);

      if (target) {
        // Take damage
        target.health = Math.max(0, target.health - SHOT_DAMAGE);

        // Increase the hit statistic
        player.numHits++;

        // Update the clients to the new health
        this.sendStateUpdate(hit.body.userData.userId, target);
      }
    }

    // Send the player shot update
    this.sendAll('duelShot', {
      userId,
      startX, startY, endX, endY,
      direction,
      hit: hit?.body.userData.userId || null,
    });

    // If someone has now won the game
    const winner = this.checkWinner();
    if (winner) {
      // Set the winner
      this.winner = winner;

      // Set the round state to over
      this.roundOver.pass = true;
    }
  }

  /**
   * Aims a player's gun in a specific direction
   * @param userId The user ID of the user
   * @param client The client object for the user
   * @param payload Contains { direction: number } with the aim direction in radians
   */
  handlePlayerAim(userId: string, client: SocketClient, payload: any) {
    // If the player is not in the game
    const player = this.players.get(userId);
    if (!player) {
      client.socket.emit('gameError', {
        message: 'Cannot process response because you have been removed from the game.',
      });
      return;
    }

    // If the direction is invalid
    const direction = payload.direction;
    if (typeof direction !== 'number') {
      client.socket.emit('gameError', {
        message: 'Invalid aim direction specified. ' + direction,
      });
      return;
    }

    player.aimAngle = payload.direction;

    // Send the state update
    this.sendStateUpdate(userId, player);
  }

  /**
   * Updates the players' data for the beginning of a duel
   */
  initializeDuel() {
    // Get the map
    this.initializeMap(getRandomMap());

    // Get the starting positions based on the number of players
    const sPosList = [...this.currentMap.spawnCoordinates];

    // For each player
    for (const [uid, p] of this.players) {
      // Set the player's position
      const pos = sPosList.pop();
      if (!pos) return;

      // Set the player's health
      p.health = STARTING_HEALTH;

      // Create the player's body
      p.physicsBody = this.collisionSystem.createCircle({ x: pos[0], y: pos[1] }, PLAYER_RADIUS, {
        userData: {
          userId: uid,
        }
      });
    }
  }

  /**
   * Sets the local variables to match a map change
   */
  initializeMap(map: DuelMap) {
    this.currentMap = map;

    // Clear all the current walls
    this.collisionSystem.clear();
    this.walls = [];

    // Populate the new walls
    for (const polygon of map.polygons) {
      // Convert the polygon coordinates to points
      const points = [];
      for (const pt of polygon) {
        points.push({
          x: pt[0],
          y: pt[1],
        });
      }

      // Create a polygon and add it
      this.walls.push(this.collisionSystem.createPolygon({ x: 0, y: 0 }, points, {
        isStatic: true,
      }));
    }
  }

  /**
   * Sends player state updates for all players
   */
  updateAllStates() {
    for (const [userId, p] of this.players) this.sendStateUpdate(userId, p);
  }

  /**
   * Updates the state for a given player
   */
  sendStateUpdate(userId: string, player: DuelPlayerData) {
    this.sendAll('duelPlayerState', {
      userId,
      xPos: player.physicsBody.x,
      yPos: player.physicsBody.y,
      health: player.health,
      aimAngle: player.aimAngle,
    }); 
  }

  /**
   * Checks whether all players in the game are ready
   */
  checkReady(): boolean {
    for (const p of this.players.values()) {
      if (!p.ready) return false;
    }
    return true;
  }

  /**
   * Sends a ready state update to all clients
   */
  sendReadyStateUpdate() {
    this.sendAll('duelReadyState', {
      readyState: this.getReadyState(),
      allReady: this.allReady.pass,
    });
  }

  /**
   * Gets the table of players who are ready
   */
  getReadyState() {
    const result = [];
    for (const [userId, p] of this.players) {
      result.push({
        userId, ready: p.ready
      });
    }
    return result;
  }

  checkWinner(): string | null {
    const alive: string[] = [];

    // Check if players are alive
    for (const [userId, p] of this.players) {
      if (p.health > 0) alive.push(userId);
    }

    // If there is only one player alive return his or her user ID
    if (alive.length === 1) return alive[0];

    // Otherwise nobody has won yet, return null
    return null;
  }

  /**
   * Detects shot collisions with players
   * @param x The x position of the player
   * @param y The y position of the player
   * @param direction The direction of the shot in radians
   * @returns The userId of the player that was hit or null
   */
  fireShot(x: number, y: number, direction: number): string | null {
    // Set the shot starting position to just outside the player's bounding box
    const startX = x + PLAYER_RADIUS * SHOT_PADDING_MULTIPLIER * Math.cos(direction);
    const startY = y - PLAYER_RADIUS * SHOT_PADDING_MULTIPLIER * Math.sin(direction);
    // Get the shot endpoints
    const endX = startX + SHOT_RANGE * Math.cos(direction);
    const endY = startY - SHOT_RANGE * Math.sin(direction);

    // logger.debug(`Shot fired: position: (${x}, ${y}), direction: ${direction} rad (${direction * 180 / Math.PI} deg), start: (${startX}, ${startY}), end: (${endX}, ${endY})`);

    // Get the raycast collision result
    const hit = this.collisionSystem.raycast(
      { x: startX, y: startY },
      { x: endX, y: endY },
      (body, ray) => ('userId' in body.userData),
    );

    if (!hit) return null;
    return hit.body.userData.userId;
  }

  /**
   * Gets an array of stats containing each player in the game's data
   * @returns 
   */
  getStats() {
    const stats: Map<string, object> = new Map();
    for (const [userId, p] of this.players) {
      stats.set(userId, {
        numShots: p.numShots,
        numHits: p.numHits,
        numWins: p.numWins,
      });
    }
    return stats;
  }
}