"use client";

import { useEffect } from "react";
import { useTheater } from "../hooks/useTheater";
import { Notice } from "./Notice";

export type SceneFailureKind = "missing" | "failed";

/**
 * A scene that cannot be shown, said kindly inside the window (Lib-Theater "States"). Two ways on:
 * "failed" offers a retry and the app itself; "missing" is a developer's mistake, offers the next
 * scene and is reported through `onEvent` (never shown as a code or a route). The others still play.
 */
export function SceneFailure({
  kind,
  onRetry,
}: {
  kind: SceneFailureKind;
  onRetry?: () => void;
}) {
  const { labels, scene, cta, count, next, open, report } = useTheater();
  const href = scene?.href ?? cta?.href;

  useEffect(() => {
    report(kind);
  }, [kind, report]);

  const missing = kind === "missing";
  return (
    <Notice
      title={missing ? labels.missingTitle : labels.errorTitle}
      actions={
        <>
          {missing ? (
            count > 1 ? (
              <button type="button" className="theater__action" onClick={next}>
                {labels.next}
              </button>
            ) : null
          ) : (
            <button type="button" className="theater__action" onClick={onRetry}>
              {labels.retry}
            </button>
          )}
          {!missing && href ? (
            <a
              className="theater__action theater__action--quiet"
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={() => open(href)}
            >
              {cta?.label ?? labels.open}
            </a>
          ) : null}
        </>
      }
    >
      <span>{missing ? labels.missingBody : labels.errorBody}</span>
    </Notice>
  );
}
