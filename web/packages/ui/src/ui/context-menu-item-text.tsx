import { Text } from "./text";

/** An item's label, and under it the reason it is disabled or a note about its last try. */
export function ItemText({ labelId, noteId, line, enabled, children }: {
  labelId: string;
  noteId: string;
  line?: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (line === undefined) return <Text className="min-w-0 flex-1">{children}</Text>;
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <Text id={labelId} tone={enabled ? undefined : "muted"}>{children}</Text>
      <Text id={noteId} size="xs" tone="muted">{line}</Text>
    </span>
  );
}
