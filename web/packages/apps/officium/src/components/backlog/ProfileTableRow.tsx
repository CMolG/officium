"use client";

import { Text } from "@javadaba/ui";

import { kiloTokens, percent, profileName, total } from "../../lib/backlog/profile-metrics-format";
import type { ProfileRow } from "../../lib/backlog/profile-metrics-types";

/** How many of the clean deliveries the tokens average over, as "(n of m)" (card://JAVA-1588). Absent from an API
 *  older than it. */
const tokenCount = (cost: ProfileRow["cost"]) =>
  cost.cleanWithTokens === undefined ? "" : ` (${cost.cleanWithTokens} of ${cost.cleanDeliveries})`;

/** One work profile's line in Contributions' "By AI profile" table (card://JAVA-1527). */
export function ProfileTableRow({ row, names }: { row: ProfileRow; names: Record<string, string> }) {
  const cost = row.cost;
  return (
    <tr>
      <th scope="row" className="text-left! text-sm! font-medium! normal-case! tracking-normal! text-[color:var(--jd-ink)]!"><Text>{profileName(row.profileId, names)}</Text></th>
      <td data-num><Text>{row.reviewed}</Text></td>
      <td data-num><Text>{percent(row.firstTimePassRate)}</Text></td>
      <td data-num><Text>{percent(row.codeHealthRate)}</Text></td>
      <td data-num><Text>{total(row.violationsByDimension)}</Text></td>
      <td data-num><Text>{total(row.escapedByPhase)}</Text></td>
      <td data-num><Text>{`${cost.hours} h + ${cost.debtHours} h debt`}</Text></td>
      <td data-num>
        <Text>{cost.hoursPerCleanDelivery === null ? "—" : `${cost.hoursPerCleanDelivery} h · ${kiloTokens(cost.tokensPerCleanDelivery)}${tokenCount(cost)}`}</Text>
      </td>
    </tr>
  );
}
