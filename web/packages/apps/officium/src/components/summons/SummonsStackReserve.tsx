import { useStackReserved } from "../../lib/summons/stack-reserve";
import { stackReserveHeight } from "../../lib/summons/summons-stack-reserve";

/** The end of a board scroll area: as tall as the toasts on screen cover, on a phone. */
export function SummonsStackReserve() {
  const height = stackReserveHeight(useStackReserved());
  return <div aria-hidden="true" data-testid="summons-stack-reserve" className="shrink-0" style={{ height }} />;
}
