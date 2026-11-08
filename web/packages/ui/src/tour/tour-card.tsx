import { useId, type CSSProperties, type Ref } from "react";

import { cn } from "../lib/cn";
import { Button } from "../ui/button";
import { Glyph } from "../ui/glyph";
import { IconButton } from "../ui/icon-button";
import { ProductSeal } from "../ui/product-seal";
import { TOUR_LABELS_EN } from "./labels";
import { TourDots } from "./tour-dots";
import { TourTryIt } from "./tour-try-it";
import type { TourDefinition, TourStep } from "./types";

/*
 * The tour's card (Library 15 § The card): small, and always the same. From the top: the product's
 * seal with the tour's name and the step ("Your first component · 2 of 5"), the cross that ends the
 * tour, a title, one or two sentences, an optional action, progress as dots, and Back / Next (Done
 * on the last step). On a phone it is a bottom sheet with a grab handle and 44 px buttons.
 *
 * It is a dialog named after the tour and its step, and the lit part's name is read with it.
 */

export interface TourCardProps {
  tour: Pick<TourDefinition, "name" | "brand" | "labels" | "lang">;
  step: TourStep;
  /** Zero-based. */
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onEnd: () => void;
  /** The action the step asked for has been done. */
  tried?: boolean;
  /** What a screen reader hears for the lit part. */
  highlightedName?: string | null;
  variant?: "card" | "sheet";
  /** Drawn in the flow with a quiet shadow (the gallery, docs) instead of floating over the page. */
  inline?: boolean;
  style?: CSSProperties;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function TourCard({
  tour,
  step,
  index,
  total,
  onBack,
  onNext,
  onEnd,
  tried = false,
  highlightedName,
  variant = "card",
  inline = false,
  style,
  className,
  ref,
}: TourCardProps) {
  const labels = tour.labels ?? TOUR_LABELS_EN;
  const bodyId = useId();
  const sheet = variant === "sheet";
  const last = index + 1 >= total;
  const buttonSize = sheet ? "md" : "sm";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={labels.dialogName(tour.name, index + 1, total)}
      aria-describedby={bodyId}
      lang={tour.lang}
      tabIndex={-1}
      data-jd-component="TourCard"
      data-jd-tour-card=""
      style={style}
      className={cn(
        "flex flex-col gap-2.5 bg-[color:var(--jd-raised)] text-left text-[color:var(--jd-ink)] outline-none",
        sheet
          ? "rounded-[22px] px-4 pb-4 pt-2.5"
          : "w-[300px] max-w-[calc(100vw-24px)] rounded-[18px] p-4",
        inline ? "relative shadow-[var(--jd-shadow-overlay)]" : "shadow-[var(--jd-shadow-overlay)]",
        className,
      )}
    >
      {sheet && <span aria-hidden="true" className="h-1 w-10 self-center rounded-sm bg-[color:var(--jd-line)]" />}
      <div className="flex flex-row items-center justify-between gap-2">
        <span className="flex min-w-0 flex-row items-center gap-1.5 font-[family-name:var(--font-jd-kicker)] text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-faint)]">
          <ProductSeal brand={tour.brand} size={16} />
          <span className="truncate">{`${tour.name} · ${labels.stepOf(index + 1, total)}`}</span>
        </span>
        <IconButton aria-label={labels.end} onClick={onEnd} className="size-7 rounded-lg pointer-coarse:size-7">
          <Glyph name="x" size={14} />
        </IconButton>
      </div>

      {step.media && (
        <div className="aspect-video overflow-hidden rounded-xl bg-[color:var(--jd-card)]">{step.media}</div>
      )}

      <p className="m-0 text-base font-bold leading-snug">{step.title}</p>
      <p id={bodyId} className="m-0 text-[13px] leading-normal text-[color:var(--jd-muted)]">
        {step.body}
      </p>
      {highlightedName && (
        <span className="sr-only">{`${labels.highlighted} ${highlightedName}`}</span>
      )}

      {step.tryIt && <TourTryIt lead={labels.tryIt} label={step.tryIt.label} done={tried} />}

      <div className="flex flex-row items-center justify-between gap-2">
        <TourDots index={index} total={total} />
        <span className="flex flex-row items-center gap-1">
          {index > 0 && (
            <Button register="ui" variant="ghost" size={buttonSize} onClick={onBack}>
              {labels.back}
            </Button>
          )}
          <Button register="ui" variant="solid" size={buttonSize} onClick={onNext} data-jd-tour-next="">
            {last ? labels.done : labels.next}
            {!last && <Glyph name="arrow-right" size={14} />}
          </Button>
        </span>
      </div>
    </div>
  );
}
