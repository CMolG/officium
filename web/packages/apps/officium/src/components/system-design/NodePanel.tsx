import { X } from "lucide-react";
import { Button, Text } from "@javadaba/ui";

import type { SystemModel, SystemNode } from "../../lib/system-design/types";
import { KindChip } from "./KindChip";
import { KINDS } from "./kinds";
import { NodeLinks } from "./NodeLinks";

/** What the selected node is, from its description and the edges around it. */
export function NodePanel({ model, node, onClose }: { model: SystemModel; node: SystemNode; onClose: () => void }) {
  const nameOf = (id: string) => model.nodes.find((n) => n.id === id)?.label ?? id;
  const note = (label: string | undefined, name: string) => (label ? `${name} (${label})` : name);
  const sends = model.edges.filter((e) => e.from === node.id).map((e) => note(e.label, nameOf(e.to)));
  const receives = model.edges.filter((e) => e.to === node.id).map((e) => note(e.label, nameOf(e.from)));
  const group = model.groups.find((g) => g.id === node.group);
  const { word } = KINDS[node.kind];

  return (
    <aside aria-label={`About ${node.label}`} data-testid="node-panel" className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto bg-[color:var(--jd-page)] p-4 md:w-[340px]">
      <div className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-row items-center gap-2.5">
          <KindChip kind={node.kind} />
          <div className="flex min-w-0 flex-col">
            <Text as="h2" className="break-words text-base font-bold">
              {node.label}
            </Text>
            <Text size="xs" className="text-[color:var(--jd-muted)]">
              {word}
              {group ? ` · ${group.label}` : ""}
            </Text>
          </div>
        </div>
        <Button type="button" register="ui" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Close details" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        {node.description ?? "No description yet. Add a \"description\" to this node on the documentation page."}
      </Text>
      <NodeLinks title="Sends to" labels={sends} />
      <NodeLinks title="Receives from" labels={receives} />
    </aside>
  );
}
