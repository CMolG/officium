"use client";

import { useState } from "react";

import { Button, Text } from "@javadaba/ui";

import { DocNodeIcon } from "./DocNodeIcon";
import { NodeAppearanceDialog } from "./NodeAppearanceDialog";

/**
 * The icon a new page gets (Doc-Sections, "A new page gets an icon", JAVA-1765): picked from the title, shown before the
 * page is made, and changeable with the same picker a page's icon is changed with. `chosen` is what the person picked, null
 * while the title decides.
 */
export function NewPageIcon({ icon, title, chosen, onChoose }: { icon: string; title: string; chosen: boolean; onChoose: (icon: string) => void }) {
  const [changing, setChanging] = useState(false);
  return (
    <div className="flex flex-row items-center gap-3" data-testid="new-page-icon">
      <span className="flex size-10 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-control)] bg-[color:var(--jd-card)]">
        <DocNodeIcon icon={icon} color={null} isSection={false} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Text className="text-sm font-semibold">{chosen ? "Icon you picked" : "Icon picked from the title"}</Text>
        <Text className="text-xs text-[color:var(--jd-muted)]">Change it any time</Text>
      </span>
      <Button type="button" register="ui" size="sm" variant="ghost" onClick={() => setChanging(true)}>
        Change
      </Button>
      {changing && (
        <NodeAppearanceDialog
          node={{ name: title || "New page", icon, iconColor: null }}
          onClose={() => setChanging(false)}
          onSubmit={async ({ icon: picked }) => {
            if (picked) onChoose(picked);
            setChanging(false);
            return null;
          }}
        />
      )}
    </div>
  );
}
