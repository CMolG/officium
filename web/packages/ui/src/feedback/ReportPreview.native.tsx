import * as React from "react";

import { Text } from "../ui/text";
import type { FeedbackLabels } from "./labels";
import type { ReportPreview as Preview } from "./report-subject";

/** Android shows the name only; a real capture there is a later card. */
export function ReportPreview({ preview, labels }: { preview: Preview; labels: FeedbackLabels; route?: string }) {
  return (
    <Text size="xs" tone="muted">
      {labels.pointedAt}: {preview.name}
      {preview.source ? ` ${preview.source}` : ""}
    </Text>
  );
}
