import { Card, cardToString } from "./cards";
import { rankCardsFast } from "phe";

export const gradePlayerHands = (river: string[], players: Map<string, string[]>): Map<string, number> => {
  // The rankings
  const result = new Map<string, number>();

  // Grade each player's cards with the river
  for (const p of players) {
    const hand = [...river, ...p[1]];
    result.set(p[0], rankCardsFast(hand));
  }

  return result;
}

/**
 * Retrieves the winners of a Hold 'em round
 * @param river The Card objects composing the river
 * @param players The players participating in the showdown
 * @returns An array of user IDs of the players who have tied for victory
 */
export const getWinners = (river: Card[], players: Map<string, Card[]>): string[] => {
  // Process the river into an array of string card representations
  const sRiver = river.map((card) => cardToString(card));
  // Do the same for the players
  const sPlayers = new Map<string, string[]>();
  for (const p of players) {
    sPlayers.set(p[0], p[1].map((card) => cardToString(card)));
  }

  // Get the scores for the players' hands
  const scores = gradePlayerHands(sRiver, sPlayers);

  // Find the players with the lowest score
  let lowest: [string, number][] = [['', Number.MAX_SAFE_INTEGER]];
  for (const [uid, score] of scores) {
    // If there is a tie between this player and the current lowest score
    if (score === lowest[0][1]) {
      lowest.push([uid, score]);
    }
    // If this player has a better hand
    else if (score < lowest[0][1]) {
      lowest = [[uid, score]];
    }
  }
  
  // Return the lowest UIDs
  return lowest.map((p) => p[0]);
}