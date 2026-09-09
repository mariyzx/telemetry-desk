export interface AppLifecycle {
  isQuitting: () => boolean;
  markQuitting: () => void;
  requestQuit: (quit: () => void) => void;
}

export function createAppLifecycle(): AppLifecycle {
  let quitting = false;

  return {
    isQuitting: () => quitting,
    markQuitting: () => {
      quitting = true;
    },
    requestQuit: (quit) => {
      quitting = true;
      quit();
    },
  };
}
