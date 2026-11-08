"use client";

import { useLazy } from "../../lib/icons/use-lazy";
import { PickerSkeleton } from "./PickerSkeleton";
import type { PickerProps } from "./picker-types";
import { PickerStatus } from "./PickerStatus";

/** The picker panel is its own chunk: the dialog that opens it ships without the icon sets. */
const loadPanel = () => import("./IconPickerPanel").then((module) => module.IconPickerPanel);

/** The loader the dialog renders: it fetches the panel, then hands it the draft value. */
export function IconPickerLoader(props: PickerProps) {
  const panel = useLazy(loadPanel);
  if (panel.status === "failed") {
    return (
      <PickerStatus
        message="Couldn't load the icon picker. The connection probably dropped; nothing is wrong with your page."
        onRetry={panel.retry}
      />
    );
  }
  if (panel.status === "loading") return <PickerSkeleton label="Loading icons..." header />;
  const Panel = panel.value;
  return <Panel {...props} />;
}
