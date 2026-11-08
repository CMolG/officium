import { createContext, useContext } from "react";

/** The selected tab and how to change it, shared by `Tabs` and its parts on Android. */
export const TabsContext = createContext<{ value: string; select: (value: string) => void }>({
  value: "",
  select: () => {},
});

export const useTabs = () => useContext(TabsContext);
