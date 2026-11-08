import { Copy, FolderInput, LayoutTemplate } from "lucide-react";

import { OPTION_HOVER, OPTION_ROW } from "./doc-page-option-row";

/**
 * The "Page options" that act on the page as a whole: Move to… and Duplicate (JAVA-792), and Make a template
 * (JAVA-801). Each opens a dialog of its own, so it closes the popover first. One that can't apply is absent.
 */
export function DocPageOptionActions({
  onMove,
  onDuplicate,
  onMakeTemplate,
  onClose,
}: {
  onMove?: () => void;
  onDuplicate?: () => void;
  onMakeTemplate?: () => void;
  onClose: () => void;
}) {
  const row = `${OPTION_ROW} ${OPTION_HOVER}`;
  return (
    <>
      {onMove && (
        <button type="button" className={row} onClick={() => (onClose(), onMove())}>
          <span>Move to…</span>
          <FolderInput size={14} aria-hidden="true" />
        </button>
      )}
      {onDuplicate && (
        <button type="button" className={row} onClick={() => (onClose(), onDuplicate())}>
          <span>Duplicate</span>
          <Copy size={14} aria-hidden="true" />
        </button>
      )}
      {onMakeTemplate && (
        <button type="button" className={row} onClick={() => (onClose(), onMakeTemplate())}>
          <span>Make a template</span>
          <LayoutTemplate size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
