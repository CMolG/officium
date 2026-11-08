/*
 * The design system's hooks, in their own subpath.
 *
 * They deliberately do NOT hang off the `.` barrel: that one gets imported by server
 * components, and everything here is `"use client"`. Mixing them would force any page
 * that only wanted a `<Button>` to be marked as client.
 */
export {
  useVisualPerformance,
  type VisualPerformanceMode,
  type VisualPerformanceInfo,
} from "./use-visual-performance";
// App shortcuts that stay out of the way while a person types (JAVA-799).
export { useShortcuts, type Shortcut } from "./use-shortcuts";
// What the consent bar reserves at the page's bottom, for a floating piece docked above it.
export { useBottomReserve } from "./use-bottom-reserve";
// One autosave for every editor in the tree (JAVA-796): debounced, one save in flight, nothing dropped.
export { useAutosave, type Autosave, type UseAutosaveOptions } from "./use-autosave";
export {
  AutosaveController,
  backoffDelay,
  defaultClassify,
  type AutosaveFailure,
  type AutosaveState,
  type AutosaveStatus,
} from "./autosave";
