import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Modal, Pressable, View, useWindowDimensions, type View as ViewType } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { EDGE_PADDING, placeAnchored, type Box, type Placement } from "../lib/anchor-place";
import { useLayerMounted } from "../lib/use-layer-mounted";
import { useSystemBars } from "../lib/use-system-bars.native";
import { layerMotion } from "../motion/presets.native";

/*
 * The floating layer under Popover and Select (JAVA-1486): a transparent, edge-to-edge `Modal`
 * above everything, a scrim that closes it on an outside press (System Back closes it through
 * `onRequestClose`), and a panel placed from the anchor's window rect by `placeAnchored` -- under
 * it, flipped above when it does not fit, never under the system bars. Edge to edge, the Modal's
 * origin is the window's, which is the origin `measureInWindow` reports in.
 *
 * The panel's size is unknown until it has been laid out, so it is first drawn invisible at the
 * window's corner, where it has the whole width to size itself in (as wide as its content, the
 * anchor at least, the window at most), then placed at that width and entered with the `jd-pop`
 * preset. Not part of the public barrel.
 */

export interface AnchoredLayerProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<ViewType | null>;
  align?: "start" | "center" | "end";
  gap?: number;
  /** Floor for the panel's width, usually the anchor's. */
  minWidth?: number;
  /** Ceiling for its height; the room left on screen can only lower it. */
  maxHeight?: number;
  children?: ReactNode;
}

/** A press on the panel is not an outside press: the panel takes it before the scrim can. */
const claimPress = () => true;

export function AnchoredLayer({ open, onClose, anchorRef, align = "start", gap, minWidth, maxHeight, children }: AnchoredLayerProps) {
  const mounted = useLayerMounted(open);
  const reduced = useReducedMotion();
  const win = useWindowDimensions();
  const bars = useSystemBars();
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSize(null);
    anchorRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  }, [open, anchorRef]);

  const placement: Placement | null =
    anchor && size ? placeAnchored(anchor, size, win, { align, gap, insets: { top: bars.top, bottom: bars.bottom } }) : null;
  const room = Math.min(maxHeight ?? Infinity, placement?.maxHeight ?? Infinity);
  const widest = win.width - 2 * EDGE_PADDING;
  // Android lays text out on whole pixels: a panel exactly as wide as its longest line wraps that
  // line ("Unlimited / workspaces" in a Select with nothing chosen), so it gets a pixel to spare.
  const frame =
    placement && size
      ? {
          position: "absolute" as const,
          top: placement.top,
          left: placement.left,
          width: Math.min(Math.ceil(size.width) + 1, widest),
          maxHeight: room === Infinity ? undefined : room,
        }
      : {
          position: "absolute" as const,
          top: 0,
          left: 0,
          minWidth: Math.min(minWidth ?? anchor?.width ?? 0, widest),
          maxWidth: widest,
          opacity: 0,
        };

  return (
    <Modal
      transparent
      visible={mounted && anchor !== null}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose} importantForAccessibility="no">
        <View style={frame} onStartShouldSetResponder={claimPress}>
          {placement ? (
            // Unmounting this child is what plays the exit, inside the Modal that is still mounted.
            open && (
              <Animated.View
                entering={layerMotion("pop", "in", reduced, 0)}
                exiting={layerMotion("pop", "out", reduced, 0)}
                style={{ maxHeight: room === Infinity ? undefined : room }}
              >
                {children}
              </Animated.View>
            )
          ) : (
            <View onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>{children}</View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
