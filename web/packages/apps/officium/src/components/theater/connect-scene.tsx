"use client";

import { BeforeAfter } from "./before-after";
import { ConnectLinearHalf } from "./connect-linear-half";
import { ConnectOfficiumHalf } from "./connect-officium-half";
import { LINEAR_CONNECT } from "./connect-script";
import { useConnectScript } from "./use-connect-script";

/**
 * The connect scene (`/officium/app/configuration/integrations` in the landing's Theater registry): one
 * sign-in per client on Linear against one Javadaba sign-in in Officium. The proof sits under the
 * slider, outside both layers, so it is on screen in every state.
 */
export function ConnectScene() {
  const connect = useConnectScript();
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <BeforeAfter
          label="Linear's sign-ins per client against Officium's one sign-in"
          beforeLabel="Linear, per client"
          afterLabel="Officium, one sign-in"
          position={connect.position}
          onPositionChange={connect.setPosition}
          before={<ConnectLinearHalf clients={connect.clients} />}
          after={<ConnectOfficiumHalf signedIn={connect.signedIn} projects={connect.projects} />}
        />
      </div>
      <p className="border-t border-[color:var(--jd-ink)]/[0.12] px-6 py-3 text-xs text-[color:var(--jd-muted)]">
        {LINEAR_CONNECT.sentence} ({LINEAR_CONNECT.page}, {LINEAR_CONNECT.checkedOn})
      </p>
    </div>
  );
}
