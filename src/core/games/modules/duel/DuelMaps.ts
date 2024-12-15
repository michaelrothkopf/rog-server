import { Box, System } from "detect-collisions";

export interface DuelMap {
  name: string;
  expectedMapW: number;
  expectedMapH: number;
  playerCount: number;
  spawnCoordinates: number[][];
  polygons: number[][][];
}

export const AVAILABLE_MAPS: DuelMap[] = [
  {
    name: 'The Standard 1v1',
    expectedMapH: 750,
    expectedMapW: 750,
    playerCount: 2,
    spawnCoordinates: [
      [50, 50],
      [700, 700],
    ],
    polygons: [
      [[160, 0], [160, 400], [200, 400], [200, 0]],
      [[500, 0], [500, 160], [300, 160], [300, 200], [500, 200], [500, 600], [540, 600], [540, 0]],
      [[0, 460], [300, 460], [300, 500], [0, 500]],
      [[360, 600], [400, 600], [400, 750], [360, 750]],
      [[600, 160], [600, 200], [750, 200], [750, 160]],
    ],
  },
  {
    name: 'The Standard 4-Player',
    expectedMapH: 750,
    expectedMapW: 750,
    playerCount: 4,
    spawnCoordinates: [
      [50, 50],
      [700, 50],
      [50, 700],
      [700, 700],
    ],
    polygons: [
      [[160, 0], [160, 400], [200, 400], [200, 0]],
      [[500, 0], [500, 160], [300, 160], [300, 200], [500, 200], [500, 600], [540, 600], [540, 0]],
      [[0, 460], [300, 460], [300, 500], [0, 500]],
      [[360, 600], [400, 600], [400, 750], [360, 750]],
      [[600, 160], [600, 200], [750, 200], [750, 160]],
    ],
  },
];

/**
 * Picks a random map from the pool with the correct number of players
 * @param playerCount The number of players in the game
 */
export const getRandomMap = (playerCount: number = 2) => {
  const pool = AVAILABLE_MAPS.filter(m => m.playerCount === playerCount);
  return pool[Math.floor(Math.random() * pool.length)];
}