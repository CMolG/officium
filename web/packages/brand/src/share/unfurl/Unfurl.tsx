import { UnfurlDiscord } from "./UnfurlDiscord";
import { UnfurlLinkedIn } from "./UnfurlLinkedIn";
import { UnfurlMessenger } from "./UnfurlMessenger";
import { UnfurlPhone } from "./UnfurlPhone";
import { UnfurlSlack } from "./UnfurlSlack";
import { UnfurlX } from "./UnfurlX";
import type { UnfurlPlace, UnfurlProps } from "./types";

const PLACES = {
  slack: UnfurlSlack,
  x: UnfurlX,
  linkedin: UnfurlLinkedIn,
  messenger: UnfurlMessenger,
  phone: UnfurlPhone,
  discord: UnfurlDiscord,
} as const satisfies Record<UnfurlPlace, (props: UnfurlProps) => React.ReactElement>;

/** One of the six places a link lands, by name: the same card image and the same page words in each. */
export function Unfurl({ place, ...props }: UnfurlProps & { place: UnfurlPlace }) {
  const Place = PLACES[place];
  return <Place {...props} />;
}
