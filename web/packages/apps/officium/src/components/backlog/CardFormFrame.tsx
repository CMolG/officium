"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Quaestio's own fill page, embedded (`?embed=1`) in a same-origin iframe: the one fill runner, never
 * a second one (JAVA-890). Same contract as the landing's `QuaestioEmbed`: `quaestio:height` sizes
 * the frame, `quaestio:completed` says the respondent finished. That message only tells the card to
 * look again; the move to Ready is the server's, done when the form was finished.
 *
 * Web half of a `.native` pair: the iframe and `window.postMessage` have no Android twin, whose
 * file says where the form is answered instead.
 *
 * `fill` (JAVA-1045, the full-screen modal): the frame takes the height its parent column leaves it
 * and the posted height is ignored, so the runner scrolls inside the frame instead of the page.
 * It loads the runner with `&fill=1` too, so the runner takes the whole frame and centers its
 * screens in it instead of hugging the top (JAVA-1088).
 */
export function CardFormFrame({
  fillPath,
  title,
  onCompleted,
  fill = false,
}: {
  fillPath: string;
  title: string;
  onCompleted: () => void;
  fill?: boolean;
}) {
  const [height, setHeight] = useState(320);
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === "quaestio:height" && typeof data.height === "number") {
        setHeight(Math.max(240, Math.round(data.height)));
      } else if (data?.type === "quaestio:completed") {
        onCompleted();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onCompleted]);

  return (
    <div
      className={
        fill
          ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
          : "relative flex flex-col overflow-hidden rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)]"
      }
    >
      {!loaded && (
        <div role="status" data-testid="card-form-loading" className="absolute inset-0 flex flex-row items-center justify-center gap-2 text-sm text-[color:var(--jd-muted)]">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span>Loading the form…</span>
        </div>
      )}
      <iframe
        ref={frame}
        src={`${fillPath}?embed=1${fill ? "&fill=1" : ""}`}
        title={title}
        data-testid="card-form-frame"
        onLoad={() => setLoaded(true)}
        className={fill ? "h-full w-full flex-1 border-0" : "w-full border-0"}
        style={fill ? undefined : { height, minHeight: 240 }}
      />
    </div>
  );
}
