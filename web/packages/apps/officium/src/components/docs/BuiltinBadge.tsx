import { Badge, Text } from "@javadaba/ui";

/** Marks one of Officium's own pages (JAVA-783): the word says it, not the color. */
export function BuiltinBadge() {
  return (
    <Badge register="tag" tone="info" fill="subtle" size="xs" className="shrink-0">
      <Text>Officium</Text>
    </Badge>
  );
}
