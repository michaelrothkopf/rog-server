export interface TimerState {
  pass: boolean;
}

// How often to check the timer state in ms
export const CHECK_INTERVAL = 100;

/**
 * Creates a passable wait timer
 * @param timerState The timer state object to refer to
 * @param delay The delay in milliseconds after which to always terminate
 * @param resetStateAfterPass Whether to reset the timerState pass to false upon resolution
 * @returns The waiting Promise object
 */
export const createPassableWait = (timerState: TimerState, delay: number, resetStateAfterPass?: boolean): Promise<void> => {
  return new Promise(resolve => {
    // Check for the pass every CHECK_INTERVAL ms
    const interval = setInterval(() => {
      if (timerState.pass) {
        // Clear the checker
        clearInterval(interval);
        // If the user wants to reset the state, reset it
        if (resetStateAfterPass) timerState.pass = false;
        // Regardless, resolve the promise
        resolve();
      }
    }, CHECK_INTERVAL);

    // If pass never occurs, resolve after the delay
    setTimeout(() => {
      clearInterval(interval);
      // In case pass occurs between checks
      if (resetStateAfterPass) timerState.pass;
      resolve();
    }, delay);
  });
}

/**
 * Creates a non-passable wait promise
 * @param delay How long to delay
 * @returns The waiting promise
 */
export const createWait = (delay: number): Promise<void> => new Promise(resolve => setTimeout(resolve, delay));

/**
 * Creates a promise that resolves after state is updated
 * @param timerState The timer state object to refer to
 * @param resetStateAfterPass Whether to reset timerState upon passing
 * @returns The waiting Promise object
 */
export const createWaitUntil = (timerState: TimerState, resetStateAfterPass?: boolean): Promise<void> => {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (timerState.pass) {
        // Clear the checker
        clearInterval(interval);
        // If the user wants to reset the state, reset it
        if (resetStateAfterPass) timerState.pass = false;
        // Regardless, resolve the promise
        resolve();
      }
    }, CHECK_INTERVAL);
  })
}