"use client";

import * as React from "react";

import { Text } from "../ui/text";
import { fillLabel, type FeedbackLabels } from "./labels";
import { fitScale, type ReportPreview as Preview } from "./report-subject";

/**
 * What the person pointed at (Lib-Feedback § The report dialog): its picture when we could take one, and
 * always its name in words, so the picture is never the only channel. When the element closed before we
 * could capture it, the box says so and says what goes instead: the page address.
 */
export function ReportPreview({ preview, labels, route }: { preview: Preview; labels: FeedbackLabels; route?: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  const sizer = React.useRef<HTMLDivElement>(null);
  const scaler = React.useRef<HTMLDivElement>(null);
  const { subject } = preview;

  React.useLayoutEffect(() => {
    const host = box.current;
    const inner = scaler.current;
    const outer = sizer.current;
    if (!subject || !host || !inner || !outer) return;
    inner.replaceChildren(subject.node);
    const fit = () => {
      const border = host.offsetHeight - host.clientHeight;
      const cap = (parseFloat(getComputedStyle(host).maxHeight) || subject.height) - border;
      const scale = fitScale({ width: host.clientWidth, height: cap }, subject);
      outer.style.width = `${subject.width * scale}px`;
      outer.style.height = `${subject.height * scale}px`;
      inner.style.transform = `scale(${scale})`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [subject]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5" data-jd-report-subject="">
      <span className="text-[13px] font-semibold text-[color:var(--jd-ink)]">{labels.pointedAt}</span>
      <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-[color:var(--jd-card)] p-3">
        {subject && (
          <div
            ref={box}
            inert
            aria-hidden="true"
            data-jd-report-preview=""
            style={{ background: subject.backdrop }}
            className="pointer-events-none flex max-h-40 w-full flex-row items-center justify-center overflow-hidden rounded-lg [&_*]:![animation-play-state:paused] [&_*]:![animation-delay:-9999s] [&_*]:!transition-none"
          >
            <div ref={sizer} className="relative shrink-0 overflow-hidden">
              <div ref={scaler} className="absolute left-0 top-0 origin-top-left" />
            </div>
          </div>
        )}
        {subject ? (
          <span className="flex min-w-0 flex-col gap-0.5">
            <Text size="sm" weight="semibold">
              {preview.name}
            </Text>
            {preview.source && (
              <Text size="xs" tone="faint" className="break-all">
                {preview.source}
              </Text>
            )}
          </span>
        ) : (
          <span className="flex min-w-0 flex-col gap-0.5">
            <Text size="sm" weight="semibold">
              {labels.goneTitle}
            </Text>
            <Text size="xs" tone="faint" className="break-all">
              {fillLabel(labels.goneBody, { route: route ?? "" })}
            </Text>
          </span>
        )}
      </div>
    </div>
  );
}
