import { Text } from "@javadaba/ui";

/** A titled list of the nodes on the other end of a node's edges; nothing at all when there are none. */
export function NodeLinks({ title, labels }: { title: string; labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <Text as="h3" size="xs" className="font-bold uppercase tracking-wider text-[color:var(--jd-muted)]">
        {title}
      </Text>
      <ul className="flex flex-col gap-0.5 text-sm">
        {labels.map((label, i) => (
          <li key={`${label}-${i}`}>
            <Text>{label}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}
