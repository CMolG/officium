import type { CloudFeatureId } from "../../lib/cloud-features";
import { ConfigPage } from "../configuration/ConfigPage";
import { CloudLocked } from "./CloudLocked";

/** A whole Configuration page that is Cloud-only: the page keeps its title, and its body is the locked panel. */
export function CloudLockedPage({ feature, title }: { feature: CloudFeatureId; title: string }) {
  return (
    <ConfigPage title={title}>
      <CloudLocked feature={feature} />
    </ConfigPage>
  );
}
