"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";
import { usePortalContainer } from "../lib/portal-container";
import { SELECT_MAX_HEIGHT as MAX_HEIGHT, type SelectOption, type SelectProps } from "./select.shared";

export type { SelectOption, SelectProps };

/**
 * Javadaba's dropdown: its own `listbox`, not the system's `<select>`.
 *
 * <h2>Why not the native one</h2>
 * Because its panel is painted by the operating system and **can't be styled**: on a
 * black surface like Sonus's, a white macOS list shows up with its own typeface, and
 * that breaks the product illusion right at the moment of choosing. That's what the
 * user reported on 2026-08-14.
 *
 * <p>The structural reference is the IDE's `FluxorDropdown` (`../fluxor/fluxor-ide`),
 * which solved the same problem: its own listbox, panel portaled to `document.body`,
 * full keyboard support. The shape is adopted —not the code, nor its palette— and it's
 * dressed with the `--jd-*` tokens, which is what makes this belong to the system and
 * not to one app.
 *
 * <h2>What you need to know before touching it</h2>
 * <ul>
 *   <li><b>The panel is rendered in a portal.</b> Without it, any ancestor with
 *       `overflow:hidden` —a bar, a sliding panel, a scrollable row— clips it. That's
 *       why the positioning is `fixed` and the coordinates come from the trigger's
 *       `getBoundingClientRect()`.</li>
 *   <li><b>It opens upward if it doesn't fit below.</b> A dropdown near the bottom of
 *       the screen that grows outside the viewport is unusable with a keyboard.</li>
 *   <li><b>Full keyboard support</b>: arrows, Home/End, Enter, Space, Escape, and Tab.
 *       A `listbox` that only works with a mouse is worse than the native one, which
 *       did work.</li>
 *   <li><b>Layout contract</b>: the chevron sits at the trailing edge whatever the name's
 *       length; the trigger cuts a name that doesn't fit on one line with an ellipsis and
 *       carries the full name as its `title`; the open list is bounded to the viewport and
 *       wraps a long option label instead of running off the screen.</li>
 *   <li><b>Announcement contract</b>: while open the trigger carries `aria-controls` to the
 *       listbox, and each keyboard move (and a keyboard open) writes the highlighted option to a
 *       polite live region. Focus never leaves the trigger, so this is the only speech a screen
 *       reader gets; a pointer hover writes nothing.</li>
 * </ul>
 */


export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  menuWidth,
  disabled,
  ...rest
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(0);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, room: 0, above: false });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const container = usePortalContainer();
  const idPrefix = React.useId();
  const listId = `${idPrefix}-listbox`;

  const selectable = React.useMemo(() => options.filter((o) => !o.disabled), [options]);
  const selected = options.find((o) => o.value === value) ?? null;

  // The highlighted option, spoken on each keyboard move (WCAG 4.1.3): focus stays on the trigger,
  // so a screen reader hears nothing while the highlight moves. A pointer hover says nothing.
  const announce = (index: number) => {
    const option = selectable[index];
    if (option) setAnnouncement(`${option.label}${option.value === value ? ", selected" : ""}, ${index + 1} of ${selectable.length}`);
  };
  const closeList = () => {
    setOpen(false);
    setAnnouncement("");
  };

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    // Inside a portal container (a scaled `Theater` frame) `fixed` resolves against the frame,
    // not the viewport: measure in the frame's box and undo its scale, or the panel lands
    // offset by wherever the frame sits on the page.
    const frame = container?.getBoundingClientRect();
    const scale = frame && container!.offsetWidth ? frame.width / container!.offsetWidth : 1;
    const box = el.getBoundingClientRect();
    const originTop = frame?.top ?? 0;
    const originLeft = frame?.left ?? 0;
    const rightEdge = frame?.right ?? window.innerWidth;
    const bottomEdge = frame?.bottom ?? window.innerHeight;
    const spaceBelow = (bottomEdge - box.bottom) / scale;
    const spaceAbove = (box.top - originTop) / scale;
    const height = Math.min(MAX_HEIGHT, selectable.reduce((sum, o) => sum + (o.description ? 52 : 36), 8));
    // Upward if it doesn't fit below: a panel that grows outside the viewport can't be browsed.
    const above = spaceBelow < height && spaceAbove > spaceBelow;
    setCoords({
      top: above ? Math.max(8, spaceAbove - height - 6) : (box.bottom - originTop) / scale + 6,
      left: (box.left - originLeft) / scale,
      width: menuWidth ?? box.width / scale,
      // The room to the viewport's right edge: a panel wider than it would run off the screen.
      room: (rightEdge - box.left) / scale - 8,
      above,
    });
  }, [selectable, menuWidth, container]);

  React.useEffect(() => {
    if (!open) return;
    place();
    const closeOutside = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setAnnouncement("");
      }
    };
    // `true` on scroll: scroll events don't bubble up from an inner container, and the
    // panel is `fixed` — without the capture phase it's left floating away from its trigger.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", closeOutside);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", closeOutside);
    };
  }, [open, place]);

  // Inside a modal Dialog the panel sits outside the dialog's DOM (it is portaled), and Radix's
  // scroll lock cancels every wheel and touch scroll outside the dialog -- so a long list, like
  // Officium's sixteen categories, could not be scrolled with the mouse (reported 2026-09-24).
  // While a lock is on (`data-scroll-locked` on <body>, set by `react-remove-scroll-bar`), the
  // panel scrolls itself; with no lock it is left to the browser.
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const locked = () => document.body.hasAttribute("data-scroll-locked");
    const onWheel = (e: WheelEvent) => {
      if (!locked()) return;
      e.preventDefault();
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? panel.clientHeight : 1;
      panel.scrollTop += e.deltaY * unit;
    };
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (!locked() || y === undefined) return;
      e.preventDefault();
      panel.scrollTop += lastY - y;
      lastY = y;
    };
    panel.addEventListener("wheel", onWheel, { passive: false });
    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      panel.removeEventListener("wheel", onWheel);
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll<HTMLElement>('[role="option"]');
    items[focused]?.scrollIntoView({ block: "nearest" });
  }, [open, focused]);

  const choose = (option: SelectOption) => {
    onChange(option.value);
    closeList();
    triggerRef.current?.focus();
  };

  const moveTo = (index: number) => {
    setFocused(index);
    announce(index);
  };

  const onKeyPress = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        const start = Math.max(0, selectable.findIndex((o) => o.value === value));
        setFocused(start);
        announce(start);
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveTo((focused + 1) % selectable.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveTo((focused - 1 + selectable.length) % selectable.length);
        break;
      case "Home":
        e.preventDefault();
        moveTo(0);
        break;
      case "End":
        e.preventDefault();
        moveTo(selectable.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (selectable[focused]) choose(selectable[focused]);
        break;
      case "Escape":
        e.preventDefault();
        closeList();
        triggerRef.current?.focus();
        break;
      case "Tab":
        closeList();
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((a) => !a)}
        onKeyDown={onKeyPress}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest["aria-label"]}
        data-theater-target={rest["data-theater-target"]}
        title={selected?.label}
        className={cn(
          // The trigger IS a field (Lib-Controls § Select): 44 tall, the control border, the white
          // fill, the chevron at the trailing edge.
          "inline-flex min-h-11 max-w-full min-w-0 flex-row items-center justify-between gap-2 rounded-[var(--radius-jd-control)] px-3.5 text-[15px] font-medium",
          "border border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)]",
          "transition-colors duration-[var(--jd-dur-fast)] hover:border-[color:var(--jd-ink)]",
          FOCUS_RING,
          "disabled:cursor-not-allowed disabled:border-[color:var(--jd-ink)]/20 disabled:bg-[color:var(--jd-card)] disabled:text-[color:var(--jd-ink)]/55",
          className,
        )}
      >
        <span className="flex min-w-0 flex-row items-center gap-2">
          {selected?.prefix}
          <span className={cn("truncate", !selected && "text-[color:var(--jd-faint)]")}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <Glyph name="chevron-down" size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {/* Always mounted, so a change of its text is announced: a live region that appears with its text is not. */}
      <span aria-live="polite" className="sr-only">{announcement}</span>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-label={rest["aria-label"]}
            tabIndex={-1}
            onKeyDown={onKeyPress}
            // Portaled to <body>: inside a modal Dialog, Radix sets `pointer-events: none` on the
            // body, so the panel must opt back in, and the Dialog treats a press here as inside
            // (see FLOATING_LAYER_ATTR in dialog.tsx).
            data-jd-floating-layer=""
            style={{
              pointerEvents: "auto",
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: coords.width,
              // `min-width` wins over `max-width` in CSS, so a trigger near the right edge keeps its own width.
              maxWidth: coords.room,
              maxHeight: MAX_HEIGHT,
            }}
            className={cn(
              "z-[9999] overflow-y-auto rounded-[var(--radius-jd-md)] bg-[color:var(--jd-raised)] p-1 text-[color:var(--jd-ink)] shadow-[var(--jd-shadow-overlay)]",
              // It grows out of the trigger, from whichever edge it opened on. Entrance only,
              // on purpose: a listbox closes BECAUSE something was chosen, and a panel fading
              // out over the trigger would hide the value that just changed in it.
              "animate-jd-pop-in",
              coords.above ? "origin-bottom" : "origin-top",
            )}
          >
            {options.map((option, position) => {
              const index = selectable.indexOf(option);
              const active = option.value === value;
              const labelId = `${idPrefix}-${position}-label`;
              const descriptionId = option.description ? `${idPrefix}-${position}-description` : undefined;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-value={option.value}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  disabled={option.disabled}
                  onClick={() => choose(option)}
                  onMouseEnter={() => index >= 0 && setFocused(index)}
                  className={cn(
                    "flex w-full flex-row items-center gap-3 rounded-[var(--radius-jd-control)] px-3 py-2.5 text-left text-sm transition-colors",
                    "text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-card)]",
                    index === focused && "bg-[color:var(--jd-card)]",
                    active && "font-semibold",
                    // A disabled option keeps its place and its reason (the description), dimmed.
                    option.disabled && "cursor-not-allowed text-[color:var(--jd-ink)]/50 hover:bg-transparent",
                  )}
                >
                  {option.prefix}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span id={labelId} className="break-words">{option.label}</span>
                    {option.description && (
                      <span id={descriptionId} className="text-xs text-[color:var(--jd-faint)]">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {active && <Glyph name="check" className="ml-auto" />}
                </button>
              );
            })}
          </div>,
          container ?? document.body,
        )}
    </>
  );
}
