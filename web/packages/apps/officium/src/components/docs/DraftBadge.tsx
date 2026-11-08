import { Badge, Text } from "@javadaba/ui";

/**
 * Marks a page nobody has published yet (JAVA-1552). A published page carries nothing: the absence of this badge is
 * what "live" means, so the word is only ever shown where it is true. The word says it, not the colour.
 */
export function DraftBadge() {
  return (
    <span className="inline-flex shrink-0 flex-row" data-testid="doc-draft-badge">
      <Badge register="tag" tone="warning" fill="subtle" size="xs">
        <Text>Draft</Text>
      </Badge>
    </span>
  );
}
