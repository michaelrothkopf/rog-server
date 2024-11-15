export interface TimerState {
  bypass: boolean;
}

// How often to check the timer state in ms
export const CHECK_INTERVAL = 100;

/**
 * Creates a bypassable wait timer
 * @param timerState The timer state object to refer to
 * @param delay The delay in milliseconds after which to always terminate
 * @param resetStateAfterBypass Whether to reset the timerState bypass to false upon resolution
 * @returns The waiting Promise object
 */
export const createBypassableWait = (timerState: TimerState, delay: number, resetStateAfterBypass?: boolean): Promise<void> => {
  return new Promise(resolve => {
    // Check for the bypass every CHECK_INTERVAL ms
    const interval = setInterval(() => {
      if (timerState.bypass) {
        // Clear the checker
        clearInterval(interval);
        // If the user wants to reset the state, reset it
        if (resetStateAfterBypass) timerState.bypass = false;
        // Regardless, resolve the promise
        resolve();
      }
    }, CHECK_INTERVAL);

    // If bypass never occurs, resolve after the delay
    setTimeout(() => {
      clearInterval(interval);
      // In case bypass occurs between checks
      if (resetStateAfterBypass) timerState.bypass;
      resolve();
    }, delay);
  });
}

/**
 * Creates a non-bypassable wait promise
 * @param delay How long to delay
 * @returns The waiting promise
 */
export const createWait = (delay: number): Promise<void> => new Promise(resolve => setTimeout(resolve, delay));