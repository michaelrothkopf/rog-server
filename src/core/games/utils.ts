/**
 * Clamps a number between a lower and upper bound
 */
export const clamp = (value: number, lower: number, upper: number) => {
  return (value > upper ? upper : (value < lower ? lower : value));
}