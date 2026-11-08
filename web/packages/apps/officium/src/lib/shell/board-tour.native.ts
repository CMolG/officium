// The Android half of `board-tour.ts`: the guided tour lights parts of a web page by selector, and
// the Android shell has no such page. Nothing opens by itself and there is nothing to replay.

export function useAutoBoardTour(): void {}

export function useReplayBoardTour(): { start: () => void } {
  return { start: () => {} };
}
