"use client";

import { useEffect } from "react";
import { createAppBridgeIfEmbedded, type AppBridge } from "@javadaba/sdk";

import { listTours, startTour } from "./store";

const START = "tour.start:";

/**
 * Inside Javadaba OS an app's tours can be run again from the host's Help menu and the window's help
 * button (OS-Tour: "an app's own tour is triggered from Help"). The tours are already registered in
 * this page with `defineTour`; this only tells the host their names, grouped by the product they
 * belong to (`brand`, which is the app id), and starts one when the host asks. Outside the desktop
 * (no host above the page) it does nothing.
 */
export function useHostTours(): void {
  useEffect(() => {
    const byApp = new Map<string, { id: string; name: string }[]>();
    for (const { id, name, brand } of listTours()) byApp.set(brand, [...(byApp.get(brand) ?? []), { id, name }]);

    const bridges: AppBridge[] = [];
    for (const [appId, tours] of byApp) {
      const bridge = createAppBridgeIfEmbedded(appId, {
        onCommand: (command) => {
          if (command.startsWith(START)) startTour(command.slice(START.length));
        },
      });
      if (!bridge) continue;
      bridge.setTours(tours);
      bridges.push(bridge);
    }
    return () => {
      for (const bridge of bridges) {
        bridge.setTours([]);
        bridge.destroy();
      }
    };
  }, []);
}
