"use client";

import { createContext, useContext } from "react";

/**
 * Whether the person is only a viewer of the project in view (Off-Shell, "Viewers are told"). A
 * viewer is not offered what they cannot use: no drag handles, no New card, no status change, no
 * composer. The board provides it from the project's role; anywhere it is not provided, nothing is
 * read-only (the product page's Theater plays a board its visitor may move cards on).
 */
const ReadOnlyContext = createContext(false);

export const ReadOnlyProvider = ReadOnlyContext.Provider;

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
