import { useEffect, useLayoutEffect } from "react";

/** `useLayoutEffect` where there is a DOM, `useEffect` on the server (where the former only warns). */
export const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
