import { SectionHead, Table, Text } from "@javadaba/ui";

import { AGENTS_DATA, AGENTS_DATA_URL, longDate } from "@/lib/agents/agents-data";

/** The operation catalog of Officium's MCP server, by family, counted from the server's own `discover`. */
export function AgentsCatalog() {
  const { catalog, generatedOn } = AGENTS_DATA;
  return (
    <section id="catalog" aria-label="Operation catalog" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHead kicker="02 · Catalog" title={`The Officium MCP server exposes ${catalog.total} operations`} />
      <div className="mt-6 flex max-w-prose flex-col gap-3">
        <Text type="body-l" tone="muted" className="text-pretty">
          Two MCP tools carry them all: <code>discover</code> lists the operations with their input schemas, and{" "}
          <code>query</code> runs one by key. {catalog.read} operations only read and {catalog.write} write, under two
          OAuth scopes: <code>{catalog.scopes[0]}</code> and <code>{catalog.scopes[1]}</code>. An agent signed in with
          the read scope alone cannot change a card.
        </Text>
        <Text size="sm" tone="muted">
          Counted from the server on {longDate(generatedOn)}. The full list, one row per operation, is at{" "}
          <a href={AGENTS_DATA_URL} className="underline underline-offset-4">/officium/agents/data.json</a>.
        </Text>
      </div>
      <div className="mt-8">
        <Table stickyFirst>
          <caption className="sr-only">Officium MCP operations by family</caption>
          <thead>
            <tr>
              <th scope="col">Family</th>
              <th scope="col" data-num>Operations</th>
              <th scope="col" data-num>Read</th>
              <th scope="col" data-num>Write</th>
            </tr>
          </thead>
          <tbody>
            {catalog.families.map((family) => (
              <tr key={family.name}>
                <th scope="row"><code>{family.name}.*</code></th>
                <td data-num>{family.total}</td>
                <td data-num>{family.read}</td>
                <td data-num>{family.write}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
}
