/** Android has no windows to pop out of: the tray stays where it is and the Pop out action never shows. */

export type PoppedOut = { win: never; root: never };

export const openPopOutWindow = async (_title: string): Promise<PoppedOut | null> => null;
export const focusMainWindow = (): void => {};
export const onMainPageHide = (_then: () => void): (() => void) => () => {};
export const POP_OUT_SIZE = { width: 0, height: 0 } as const;
