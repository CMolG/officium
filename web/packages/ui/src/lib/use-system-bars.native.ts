import { useContext } from "react";
import { SafeAreaInsetsContext, type EdgeInsets } from "react-native-safe-area-context";

const NONE: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The system bars' insets (JAVA-1486). A layer's `Modal` draws edge to edge -- Android 15 and up
 * force it, and the twins ask for it everywhere so the result never depends on the version -- and
 * SystemUI owns the touches over the status and navigation bars, so a control drawn under them
 * cannot be pressed. expo-router mounts the provider; outside one there are no bars to avoid.
 */
export function useSystemBars(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) ?? NONE;
}
