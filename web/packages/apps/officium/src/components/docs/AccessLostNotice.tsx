"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { Doodle, KID } from "@javadaba/brand/doodles";
import { copyText } from "@javadaba/sdk/platform";
import { Button, Text } from "@javadaba/ui";

/**
 * Access went away mid-edit (Doc-Edit, "Access lost"): the doodle that stops, what happened, and the person's own text to
 * take away. Nothing they typed is dropped; Copy the text puts it on the clipboard.
 */
export function AccessLostNotice({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="alert" data-testid="doc-access-lost" className="flex flex-row flex-wrap items-center gap-4 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4">
      <Doodle name={KID.stop} size="heading" decorative />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <Text className="font-semibold">You no longer have access to this page.</Text>
        <Text className="text-sm text-[color:var(--jd-muted)]">Your unsaved text is below. Copy it before you leave.</Text>
      </div>
      <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" onClick={async () => setCopied(await copyText(body))}>
        <Copy size={14} aria-hidden="true" />
        {copied ? "Copied" : "Copy the text"}
      </Button>
    </div>
  );
}
