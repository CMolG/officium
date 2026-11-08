"use client";

import * as React from "react";

import { Text } from "../ui/text";
import {
  ContextMenu,
  useContextMenuTrigger,
  type ContextMenuPoint,
  type ContextMenuRequest,
} from "../ui/context-menu";
import { collectMetadata, reportedElement, type FeedbackEnv, type FeedbackMetadata } from "./collect-metadata";
import { describeTarget, runEditAction, type EditAction, type TargetInfo } from "./inherited-actions";
import { useDesktopWindow } from "./desktop-window";
import { labelsFor, type FeedbackLabels } from "./labels";
import { FeedbackMenuRows } from "./FeedbackMenuRows";
import { createMenuRegistry, MenuOpenerContext, MenuRegistryContext } from "./menu-registry";
import type { ResolvedMenu } from "./menu-model";
import { ReportDialog } from "./ReportDialog";
import { captureSubject, type ReportPreview } from "./report-subject";
import type { FeedbackKind, ReportInput, SubmitResult } from "./submit";

export interface FeedbackContextMenuProps {
  children: React.ReactNode;
  /** Strings, overridden key by key by an app with locales. */
  labels?: Partial<FeedbackLabels>;
  /** What the DOM cannot say; merged over what the layer reads itself (url, locale, viewport). */
  env?: Partial<Omit<FeedbackEnv, "now">>;
  /** Anonymous senders get an email field. */
  signedIn?: boolean;
  /** Injected by tests; the default posts to the feedback context. */
  submit?: (input: ReportInput) => Promise<SubmitResult>;
}

interface Opened {
  point: ContextMenuPoint;
  request: ContextMenuRequest;
  info: TargetInfo;
  /** The nearest scope's entries for what was pointed at, if it is in one. */
  own: ResolvedMenu | null;
}

/**
 * Our own floating layers (this menu, popovers) are part of this tree for React (portals bubble), but a gesture in them
 * is not for us. A dialog is: people report from inside modals too (JAVA-1532), and its fields keep Cut, Copy and Paste
 * through the inherited actions; Shift+right-click still reaches the browser's own menu (spellcheck). Our menu is a
 * floating layer at z-110, so it opens above a dialog and a press in it never closes the dialog. The report form itself
 * (`data-jd-feedback-report`) stays foreign: a report about the report form is not a report.
 * Decided before the trigger runs, because the trigger prevents the default first.
 */
const isForeign = (target: EventTarget) =>
  target instanceof Element && target.closest("[data-jd-floating-layer], [data-jd-feedback-report]") !== null;

/** What the layer reads off the element's own window, so no global is touched. */
function readEnv(target: Element, given: FeedbackProps["env"], signedIn: boolean): FeedbackEnv {
  const view = target.ownerDocument.defaultView;
  const root = target.ownerDocument.documentElement;
  return {
    url: view?.location.href,
    route: view?.location.pathname,
    locale: root.lang || view?.navigator.language,
    theme: root.getAttribute("data-theme") ?? (view?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    viewport: view ? `${view.innerWidth}x${view.innerHeight}` : undefined,
    userAgent: view?.navigator.userAgent,
    ...given,
    signedIn,
    now: new Date(),
  };
}
type FeedbackProps = FeedbackContextMenuProps;

/**
 * ONE menu per right-click, mounted once at a surface's root (JAVA-1091): the browser's edit and
 * link actions, the entries of the nearest `FeedbackMenuScope`, and, last, "Report a problem"
 * and "Suggest a change". Shift+right-click still reaches the browser's own menu.
 */
export function FeedbackContextMenu({ children, labels: given, env, signedIn = false, submit }: FeedbackContextMenuProps) {
  // The document's language, read when the menu opens (JAVA-1168); an app's own `labels` still win, key by key.
  const [lang, setLang] = React.useState<string>();
  const labels = React.useMemo(() => ({ ...labelsFor(lang), ...given }), [lang, given]);
  const registry = React.useMemo(createMenuRegistry, []);
  const desktopWindow = useDesktopWindow();
  const [opened, setOpened] = React.useState<Opened | null>(null);
  const [report, setReport] = React.useState<{ kind: FeedbackKind; metadata: FeedbackMetadata; preview: ReportPreview } | null>(null);
  const [blocked, setBlocked] = React.useState(false);

  const openAt = React.useCallback((request: ContextMenuRequest) => {
    setLang(request.target.ownerDocument.documentElement.lang);
    setOpened({ point: { x: request.x, y: request.y }, request, info: describeTarget(request.target), own: registry.resolve(request) });
  }, [registry]);
  const trigger = useContextMenuTrigger(openAt);

  const close = () => {
    setOpened(null);
    setBlocked(false);
  };
  const openReport = (kind: FeedbackKind) => {
    if (!opened) return;
    const target = opened.request.target;
    const metadata = collectMetadata(target, readEnv(target, { desktopWindow, ...env }, signedIn));
    // Captured now, in the select handler: the element still looks as it did at the right-click.
    const preview = { name: metadata.component?.name ?? "", source: metadata.component?.source, subject: captureSubject(reportedElement(target)) };
    setReport({ kind, metadata, preview });
  };
  const edit = async (action: EditAction) => {
    if (!opened) return;
    const done = await runEditAction(action, opened.info);
    if (action === "paste") setBlocked(!done);
    // A refused paste keeps the menu open, with its reason on the row, so it can be tried again.
    if (done) close();
  };

  const info = opened?.info;
  const own = opened?.own ?? null;
  const hasOwn = (own?.entries.length ?? 0) > 0;

  return (
    <MenuRegistryContext.Provider value={registry}>
      <MenuOpenerContext.Provider value={openAt}>
      <div
        className="contents"
        onContextMenuCapture={(event) => {
          // Shift+right-click is the escape hatch: nothing in the tree, ours included, sees it.
          if (event.shiftKey) event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (!event.defaultPrevented && !isForeign(event.target)) trigger.onKeyDown(event);
        }}
        // Capture, so a child that stops pointerdown (a canvas item) still gets the long-press.
        onPointerDownCapture={(event) => {
          if (!isForeign(event.target)) trigger.onPointerDown(event);
        }}
        onPointerUpCapture={trigger.onPointerUp}
        onPointerMoveCapture={trigger.onPointerMove}
        onPointerCancelCapture={trigger.onPointerCancel}
        onContextMenu={(event) => {
          // A component that already handled the gesture (and prevented the default) keeps it.
          if (!event.defaultPrevented && !isForeign(event.target)) trigger.onContextMenu(event);
        }}
      >
        {children}
      </div>

      <ContextMenu point={opened?.point ?? null} onClose={close} aria-label={(hasOwn ? own?.label : null) ?? labels.menuName}>
        <FeedbackMenuRows labels={labels} info={info} own={own} blocked={blocked} onEdit={(action) => void edit(action)} onReport={openReport} />
      </ContextMenu>
      {/* A sibling of the menu (a role=menu owns only items), mounted before it is filled so the change is announced. */}
      <Text className="sr-only" aria-live="polite" role="status">{blocked ? labels.clipboardBlocked : ""}</Text>

      {report && (
        <ReportDialog
          kind={report.kind}
          onKindChange={(kind) => setReport({ ...report, kind })}
          onClose={() => setReport(null)}
          labels={labels}
          metadata={report.metadata}
          preview={report.preview}
          signedIn={signedIn}
          submit={submit}
        />
      )}
      </MenuOpenerContext.Provider>
    </MenuRegistryContext.Provider>
  );
}
