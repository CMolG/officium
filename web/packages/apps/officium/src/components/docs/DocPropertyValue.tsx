import { Badge, Text } from "@javadaba/ui";

import { readableDate, STATUS_TONES, type FieldKind } from "./doc-metadata-fields";

/** One property's value, drawn as its kind asks: badges for lists, a toned badge with its word for the status, a date
 *  as a reader says it (the machine-readable date stays in `dateTime`). */
export function DocPropertyValue({ kind, values }: { kind: FieldKind; values: string[] }) {
  if (kind === "badges" || kind === "status") {
    return (
      <ul className="flex flex-row flex-wrap gap-1">
        {values.map((value) => (
          <li key={value} className="flex flex-row">
            <Badge register="tag" tone={kind === "status" ? (STATUS_TONES[value.toLowerCase()] ?? "neutral") : "neutral"} fill="subtle" size="xs">
              <Text>{value}</Text>
            </Badge>
          </li>
        ))}
      </ul>
    );
  }
  if (kind === "date") {
    return (
      <Text>
        {values.map((value, i) => (
          <time key={value} dateTime={value}>
            {i > 0 ? ", " : ""}
            {readableDate(value)}
          </time>
        ))}
      </Text>
    );
  }
  return <Text>{values.join(", ")}</Text>;
}
