export const JOIN_CODE_CHARACTERS = '23456789'; //'WERTYUOPASFGHJKZXBNM23456789';
export const DEFAULT_JOIN_CODE_LENGTH = 5;

export class JoinCodeGenerator {
  alreadyGeneratedCodes: string[] = [];

  constructor() {}

  generateCode(length: number = DEFAULT_JOIN_CODE_LENGTH) {
    // Create a blank code
    let code = '';
    do {
      // Generate the code by picking random values from JOIN_CODE_CHARACTERS
      code = '';
      for (let i = 0; i < length; i++) {
        code += JOIN_CODE_CHARACTERS[Math.floor(Math.random() * JOIN_CODE_CHARACTERS.length)];
      }
    }
    // If the code is already used, regenerate
    while (this.alreadyGeneratedCodes.includes(code));
    // Return the (guaranteed to be unique) code
    return code;
  }
}