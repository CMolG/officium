"use client";

import { useEffect, useId, useRef, useState } from "react";

type Mermaid = (typeof import("mermaid"))["default"];

/**
 * Mermaid lays a diagram out by measuring its labels in a scratch element it appends to the page
 * body, then the SVG is drawn inside the text block. `fontFamily: "inherit"` therefore measured
 * with the body font and drew with another one, and labels overflowed their nodes (JAVA-1555).
 * The family and size are read from the element the diagram will live in, as the browser resolved
 * them (so they stay the design tokens, in whatever unit they were written), and handed to mermaid
 * explicitly, after the font has loaded.
 */
async function initialize(mermaid: Mermaid, host: Element) {
  const { fontFamily, fontSize } = getComputedStyle(host);
  // Not every environment has a font set (a test DOM has none): then there is nothing to wait for.
  const fonts: FontFaceSet | undefined = host.ownerDocument.fonts;
  await fonts?.load(`${fontSize} ${fontFamily}`).catch(() => undefined);
  await fonts?.ready;
  // Room between nodes and ranks scales with the text, so edge labels (a self-loop's included)
  // do not land on their neighbours.
  const gap = 4 * parseFloat(fontSize);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily,
    themeVariables: { fontFamily, fontSize },
    flowchart: { nodeSpacing: gap, rankSpacing: gap },
    state: { nodeSpacing: gap, rankSpacing: gap },
    // The diagram is drawn with the surface's own tokens, so it reads on a light page and on a
    // dark one alike: mermaid's themes are fixed colours, and computing them would need to read
    // the page's styles before every draw.
    themeCSS: THEME_CSS,
  });
}

/**
 * The diagram engine, loaded the first time a text with a ```` ```mermaid ```` block is shown
 * (JAVA-782): it is the heaviest thing this package could pull in, and almost no text needs it, so
 * it never ships in a page's first load.
 *
 * `securityLevel: "strict"` is what makes drawing its SVG safe: the source comes from people and
 * agents, and strict mode sanitises labels and disables clicks and scripts in the diagram.
 */
let engine: Promise<Mermaid> | undefined;
function loadMermaid(): Promise<Mermaid> {
  engine ??= import("mermaid").then(({ default: mermaid }) => mermaid);
  engine.catch(() => {
    engine = undefined;
  });
  return engine;
}

const THEME_CSS = `
  text, .label, .nodeLabel, .edgeLabel, .cluster-label, .messageText, .loopText, .noteText, .actor, .titleText, span, p {
    fill: var(--jd-ink) !important; color: var(--jd-ink) !important;
  }
  .node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect, rect.actor, .note, .labelBox,
  .stateGroup rect, .entityBox, .classGroup rect {
    fill: var(--jd-page) !important; stroke: var(--jd-ink) !important;
  }
  .edgePath .path, .flowchart-link, .relation, .messageLine0, .messageLine1, .loopLine, .actor-line, .transition {
    stroke: var(--jd-muted) !important;
  }
  marker path, .arrowheadPath, .arrowhead, #arrowhead path, .marker {
    fill: var(--jd-muted) !important; stroke: var(--jd-muted) !important;
  }
  .edgeLabel, .edgeLabel rect, .labelBkg, .edgeLabel p {
    background-color: var(--jd-page) !important;
  }
  .edgeLabel rect { fill: var(--jd-page) !important; }
`;

type DiagramState =
  | { kind: "drawing" }
  | { kind: "drawn"; svg: string }
  | { kind: "failed"; error: string; last: string | null };

/** "Line 3: Expecting 'SEMI', got 'X'": the line mermaid points at, then its reason in one sentence. */
export function describeDiagramError(error: string): string {
  const line = /line\s+(\d+)/i.exec(error)?.[1];
  const reason = error
    .split("\n")
    .map((part) => part.trim())
    .filter((part) => part && !/^parse error on line/i.test(part) && !/^[-^\s]+$/.test(part))
    .pop();
  return line ? `Line ${line}: ${reason ?? error.split("\n")[0]}` : (reason ?? error);
}

const messageOf = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).trim() || "The diagram engine gave no reason.";

/**
 * A Mermaid block drawn as a diagram. Its `accTitle` and `accDescr` become the SVG's `<title>`
 * and `<desc>` (mermaid wires `aria-labelledby`/`aria-describedby` to them), so a screen reader
 * hears what the picture shows.
 *
 * While the engine loads, and when the source does not parse, the reader still gets the source,
 * which is what a diagram is written in: a broken diagram says why, above its own text.
 */
export function MermaidDiagram({ source }: { source: string }) {
  const id = `jd-mermaid-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const host = useRef<HTMLElement>(null);
  const [state, setState] = useState<DiagramState>({ kind: "drawing" });
  // The last drawing that parsed: a broken edit keeps showing it, so the picture does not vanish mid-sentence.
  const lastGood = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (lastGood.current === null) setState({ kind: "drawing" });
    loadMermaid()
      .then(async (mermaid) => {
        if (host.current) await initialize(mermaid, host.current);
        // Parse first: on a syntax error `render` leaves mermaid's own error drawing in the page.
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        lastGood.current = svg;
        if (!cancelled) setState({ kind: "drawn", svg });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ kind: "failed", error: messageOf(error), last: lastGood.current });
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (state.kind === "drawn") {
    // The SVG comes from mermaid in strict mode, never from the text itself.
    return <figure ref={host} className="jd-mermaid" data-diagram="drawn" dangerouslySetInnerHTML={{ __html: state.svg }} />;
  }
  return (
    <figure ref={host} className="jd-mermaid" data-diagram={state.kind} aria-busy={state.kind === "drawing"}>
      {state.kind === "failed" ? (
        <figcaption className="jd-mermaid-error" role="alert">
          <span>{describeDiagramError(state.error)}</span>
          <span className="jd-mermaid-note">
            {state.last ? "The last good drawing is shown." : "This diagram couldn't be drawn, so its source is shown."}
          </span>
          {/* Mermaid's reason points at the column with a caret line: it only reads in monospace. */}
          <code className="jd-mermaid-reason">{state.error}</code>
        </figcaption>
      ) : (
        <figcaption className="jd-mermaid-status">
          <span>Drawing the diagram…</span>
        </figcaption>
      )}
      {state.kind === "failed" && state.last ? (
        <div className="jd-mermaid-last" dangerouslySetInnerHTML={{ __html: state.last }} />
      ) : null}
      <pre>
        <code className="language-mermaid">{source}</code>
      </pre>
    </figure>
  );
}
