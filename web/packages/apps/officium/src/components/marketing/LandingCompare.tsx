import { Table, Text } from "@javadaba/ui";

import { SEAT_PRICES } from "./landing-pricing";

/**
 * How seat-priced trackers charge, with each row's source and the day it was read (HUECOS-7: the
 * table is real prices from the vendors' own pages, nothing inferred). Officium's row is the
 * plans above: it measures room, not seats.
 */
export function LandingCompare() {
  return (
    <div className="mt-12 flex flex-col gap-3">
      <Text type="ui" weight="semibold" as="h3">
        What a seat costs elsewhere
      </Text>
      <Table>
        <thead>
          <tr>
            <th>Tracker</th>
            <th>Plan</th>
            <th>Price</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {SEAT_PRICES.map((row) => (
            <tr key={`${row.tool}-${row.plan}`}>
              <td>{row.tool}</td>
              <td>{row.plan}</td>
              <td>{row.price}</td>
              <td>
                <a href={row.url} rel="noopener" className="underline underline-offset-2">
                  {row.page}
                </a>
                , checked on <time dateTime={row.checkedOn}>{row.checkedOn}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Text size="sm" tone="muted" className="max-w-prose text-pretty">
        Officium measures room instead of seats: people and agents on a project are not billed one by one.
      </Text>
    </div>
  );
}
