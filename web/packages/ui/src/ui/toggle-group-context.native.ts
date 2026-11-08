import { createContext, useContext } from "react";

import type { ToggleAxes } from "./toggle.shared";

export interface ToggleGroupContextValue extends ToggleAxes {
  selected: string[];
  toggle: (value: string) => void;
}

/** What a `ToggleGroup` shares with its items on Android: the selection and the group's variant and size. */
export const ToggleGroupContext = createContext<ToggleGroupContextValue>({ selected: [], toggle: () => {} });

export const useToggleGroup = () => useContext(ToggleGroupContext);
