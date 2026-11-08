import { createContext, useContext, type RefObject } from "react";
import type { Text, View } from "react-native";

export interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The title, where TalkBack's focus goes when the dialog opens. */
  titleRef: RefObject<Text | null>;
  /** The trigger, where it returns when the dialog closes. */
  triggerRef: RefObject<View | null>;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error("@javadaba/ui: a Dialog part was rendered outside a <Dialog>.");
  return context;
}
