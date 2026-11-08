import { Text } from "@javadaba/ui";
import { splitFrontmatter } from "@javadaba/rich-text";

import { asList, FIELDS, KNOWN_KEYS, OTHER_FIELD, STATUS_NOTICES } from "./doc-metadata-fields";
import { DocPropertyValue } from "./DocPropertyValue";
import { DocRelatedPages } from "./DocRelatedPages";

/**
 * A documentation page's frontmatter as a properties panel (JAVA-782, JAVA-795, redesigned in JAVA-1551): the
 * description leads as the page's summary; the other fields are label/value rows in a panel, each label with its icon
 * and its word, in the schema's order and then any other field under its own key (the text never draws the YAML, so a
 * field left out here would be invisible). A notice comes first when the page is not `stable`; status, audience and
 * tags are badges; related pages are rows named by their titles. Nothing when the page has no frontmatter.
 */
export function DocMetadata({
  projectId,
  path,
  title,
  body,
  titles,
}: {
  projectId: string;
  path: string;
  title: string;
  body: string;
  titles: ReadonlyMap<string, string>;
}) {
  const { frontmatter } = splitFrontmatter(body);
  if (!frontmatter) return null;
  const data = frontmatter.data;
  const known = FIELDS.map((field) => ({ ...field, values: asList(data[field.key]) }));
  const others = Object.keys(data)
    .filter((key) => !KNOWN_KEYS.has(key))
    .map((key) => ({ key, label: key, ...OTHER_FIELD, values: asList(data[key]) }));
  const ownTitle =
    typeof data.title === "string" && data.title !== title ? [{ key: "title", label: "Title", ...OTHER_FIELD, values: [data.title] }] : [];
  const fields = [...known, ...ownTitle, ...others].filter((field) => field.values.some(Boolean));
  const description = asList(data.description).join(" ").trim();
  const status = typeof data.status === "string" ? data.status.toLowerCase() : null;
  const notice = status && status !== "stable" ? (STATUS_NOTICES[status] ?? `Status: ${status}.`) : null;
  const related = asList(data.related);
  if (!fields.length && !notice && !related.length && !description) return null;

  return (
    <section aria-label="About this page" className="flex flex-col gap-4" data-testid="doc-metadata">
      {description && (
        <p className="max-w-3xl text-base leading-relaxed text-[color:var(--jd-muted)]" data-testid="doc-description">
          {description}
        </p>
      )}
      {notice && (
        <p role="note" className="rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] px-3 py-2 text-sm" data-testid="doc-status-notice">
          {notice}
        </p>
      )}
      {fields.length > 0 && (
        <dl
          className="flex flex-row flex-wrap rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] px-4 py-2"
          data-testid="doc-properties"
        >
          {fields.map(({ key, label, icon: Icon, kind, values }) => (
            <div key={key} className="flex w-full min-w-0 flex-row items-start gap-3 py-2 md:w-1/2 md:pr-4">
              <dt className="flex w-32 shrink-0 flex-row items-center gap-2 text-xs font-medium text-[color:var(--jd-muted)]">
                <Icon size={14} aria-hidden="true" className="shrink-0" />
                <Text>{label}</Text>
              </dt>
              <dd className="min-w-0 flex-1 break-words text-sm text-[color:var(--jd-ink)]">
                <DocPropertyValue kind={kind} values={values} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {related.length > 0 && <DocRelatedPages projectId={projectId} path={path} related={related} titles={titles} />}
    </section>
  );
}
