import { View } from "react-native";

/** The web draws an SVG cross; two rotated bars are the same mark without an SVG library. */
export function CloseGlyph() {
  return (
    <View aria-hidden className="size-4 items-center justify-center">
      <View className="absolute h-0.5 w-5 rotate-45 bg-[color:var(--jd-muted)]" />
      <View className="absolute h-0.5 w-5 -rotate-45 bg-[color:var(--jd-muted)]" />
    </View>
  );
}
