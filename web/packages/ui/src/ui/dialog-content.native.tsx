import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { cn } from "../lib/cn";
import { requestClose, type DismissEvent } from "../lib/dismiss-event";
import { focusNode } from "../lib/focus-node.native";
import { useFocusOnToggle } from "../lib/use-focus-on-toggle.native";
import { useLayerMounted } from "../lib/use-layer-mounted";
import { useSystemBars } from "../lib/use-system-bars.native";
import { layerMotion } from "../motion/presets.native";
import { CloseGlyph } from "./close-glyph.native";
import { useDialog } from "./dialog-context.native";

/*
 * The dialog's sheet: a transparent, edge-to-edge `Modal` holding a full-screen column that rises
 * from the bottom (`jd-sheet`), padded clear of the system bars, a scrolling body, and a labelled
 * 44 dp close in the top-right corner (JAVA-224's `sheetClose`), floating where the web's sticky
 * one sits. A `KeyboardAvoidingView` keeps a form above the keyboard. The Modal stays mounted for
 * the exit. Focus goes to the title once the window shows and back to the trigger once it is gone.
 *
 * The close comes AFTER the body in the tree and overlaps it on purpose: Android orders a view's
 * children for TalkBack by position, top band first, then left to right, so a close in its own
 * row above the body was read before the title (JAVA-1486).
 */

export function DialogContent({
  className,
  children,
  sheetClose = true,
  onEscapeKeyDown,
}: {
  className?: string;
  children?: ReactNode;
  sheetClose?: boolean;
  /** Runs on system Back, as on Escape on the web; `preventDefault()` keeps the dialog open (unsaved edits). */
  onEscapeKeyDown?: (event: DismissEvent) => void;
}) {
  const { open, setOpen, titleRef, triggerRef } = useDialog();
  const mounted = useLayerMounted(open);
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const bars = useSystemBars();

  useFocusOnToggle(open, triggerRef);

  return (
    <Modal
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      visible={mounted}
      animationType="none"
      onShow={() => focusNode(titleRef)}
      onRequestClose={() => requestClose(onEscapeKeyDown, () => setOpen(false))}
    >
      {open && (
        <Animated.View
          style={{ flex: 1 }}
          entering={layerMotion("sheet", "in", reduced, height)}
          exiting={layerMotion("sheet", "out", reduced, height)}
        >
          <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
            <View
              role="dialog"
              aria-modal
              className={cn("relative flex-1 bg-[color:var(--jd-raised)]", className)}
              style={{ paddingTop: bars.top, paddingBottom: bars.bottom }}
            >
              <ScrollView
                className="flex-1"
                contentContainerClassName={cn("flex-grow gap-4 p-6", sheetClose && "pt-17")}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
              {sheetClose && (
                <Pressable
                  role="button"
                  aria-label="Close"
                  onPress={() => setOpen(false)}
                  className="absolute right-4 size-11 items-center justify-center rounded-full bg-[color:var(--jd-raised)] active:bg-[color:var(--jd-ink)]/10"
                  style={{ top: bars.top + 16 }}
                >
                  <CloseGlyph />
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </Modal>
  );
}
