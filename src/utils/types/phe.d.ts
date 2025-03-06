declare module 'phe' {
  /**
   * Evaluates the 5 - 7 card codes to arrive at a number representing the hand
   * strength, smaller is better.
   *
   * @name evaluateCardCodes
   * @function
   * @param {Array.<Number>} cards the cards, i.e. `[ 49, 36, 4, 48, 41 ]`
   * @return {Number} the strength of the hand comprised by the card codes
   */
  declare function evaluateCardCodes(codes: Array<string>): number;
  /**
   * Evaluates the 5 - 7 cards to arrive at a number representing the hand
   * strength, smaller is better.
   *
   * @name evaluateCards
   * @function
   * @param {Array.<String>} cards the cards, i.e. `[ 'Ah', 'Ks', 'Td', '3c', 'Ad' ]`
   * @return {Number} the strength of the hand comprised by the cards
   */
  declare function evaluateCards(cards: Array<string>): string;
  /**
   * Same as `evaluateCards` but skips `cards` argument type check to be more
   * performant.
   */
  declare function evaluateCardsFast(cards: Array<string>): string;
  /**
   * Evaluates the given board of 5 to 7 cards provided as part of the board to
   * arrive at a number representing the hand strength, smaller is better.
   *
   * @name evaluateBoard
   * @function
   * @param {String} board the board, i.e. `'Ah Ks Td 3c Ad'`
   * @return {Number} the strength of the hand comprised by the cards of the board
   */
  declare function evaluateBoard(board: string): number;
  /**
   * Evaluates the 5 - 7 cards and then calculates the hand rank.
   *
   * @name rankCards
   * @function
   * @param {Array.<String>} cards the cards, i.e. `[ 'Ah', 'Ks', 'Td', '3c', 'Ad' ]`
   * @return {Number} the rank of the hand comprised by the cards, i.e. `1` for
   * `FOUR_OF_A_KIND` (enumerated in ranks)
   */
  declare function rankCards(cards: Array<string>): number;
  /**
   * Same as `rankCards` but skips `cards` argument type check to be more
   * performant.
   */
  declare function rankCardsFast(cards: Array<string>): number;
  /**
   * Evaluates the 5 - 7 card codes and then calculates the hand rank.
   *
   * @name rankCardCodes
   * @function
   * @param {Array.<Number>} cardCodes the card codes whose ranking to determine
   * @return {Number} the rank of the hand comprised by the card codes, i.e. `1` for
   * `FOUR_OF_A_KIND` (enumerated in ranks)
   */
  declare function rankCardCodes(cardCodes: Array<number>): number;
  /**
   * Evaluates the given board of 5 to 7 cards provided as part of the board to
   * and then calculates the hand rank.
   *
   * @name rankBoard
   * @function
   * @param {String} board the board, i.e. `'Ah Ks Td 3c Ad'`
   * @return {Number} the rank of the hand comprised by the cards, i.e. `1` for
   * `FOUR_OF_A_KIND` (enumerated in ranks)
   */
  declare function rankBoard(cards: string): number;
  /**
   * Converts a set of cards to card codes.
   *
   * @name setCardCodes
   * @function
   * @param {Set.<String>} set card strings set, i.e. `Set({'Ah', 'Ks', 'Td', '3c, 'Ad'})`
   * @return {Set.<Number>} card code set
   */
  declare function setCardCodes(set: Set<string>): Set<number>;
  /**
   * Converts a set of card codes to their string representations.
   *
   * @name setStringifyCardCodes
   * @function
   * @param {Set.<Number>} set card code set
   * @return {Set.<String>} set with string representations of the card codes,
   *                        i.e. `Set({'Ah', 'Ks', 'Td', '3c, 'Ad'})`
   */
  declare function setStringifyCardCodes(set: Set<number>): Set<string>;
  /**
    * Enumeration of possible hand ranks, each rank is a number from 0-8.
    *
    * ```
    * STRAIGHT_FLUSH
    * FOUR_OF_A_KIND
    * FULL_HOUSE
    * FLUSH
    * STRAIGHT
    * THREE_OF_A_KIND
    * TWO_PAIR
    * ONE_PAIR
    * HIGH_CARD
    * ```
    *
    * @name ranks
    * @function
    */
  declare const ranks: {
      STRAIGHT_FLUSH: any;
      FOUR_OF_A_KIND: any;
      FULL_HOUSE: any;
      FLUSH: any;
      STRAIGHT: any;
      THREE_OF_A_KIND: any;
      TWO_PAIR: any;
      ONE_PAIR: any;
      HIGH_CARD: any;
  };
}