"use client";

import { useBoardAutoloop } from "../../../lib/autoloop/autoloop-context";
import { IntegrationGateBanner } from "./IntegrationGateBanner";

/** The integration gate's banner when the board's autoloop read says it is open (card://JAVA-1820), nothing otherwise. */
export function BoardGate({ projectId }: { projectId: string }) {
  const gate = useBoardAutoloop()?.status?.gate;
  return gate?.open ? <IntegrationGateBanner gate={gate} projectId={projectId} /> : null;
}
