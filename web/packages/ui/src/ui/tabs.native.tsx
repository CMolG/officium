import { useMemo, type ReactNode } from "react";
import { View } from "react-native";

import { useControllable } from "../lib/use-controllable";
import { TabsContext } from "./tabs-context.native";

/*
 * Tabs on Android: the web's API (`value`/`defaultValue`/`onValueChange`, `TabsTrigger value`,
 * `TabsContent value`) over a `tablist` of `tab` Pressables. Only the active panel is mounted
 * (`tabpanel`), as Radix does by default. The active tab is `aria-selected` for TalkBack and
 * every tab is at least 44 dp tall. One component per file: the parts are re-exported.
 */

export { TabsContent } from "./tabs-content.native";
export { TabsList } from "./tabs-list.native";
export { TabsTrigger } from "./tabs-trigger.native";

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [current, select] = useControllable(value, defaultValue, onValueChange);
  const context = useMemo(() => ({ value: current, select }), [current, select]);
  return (
    <TabsContext.Provider value={context}>
      <View className={className}>{children}</View>
    </TabsContext.Provider>
  );
}
