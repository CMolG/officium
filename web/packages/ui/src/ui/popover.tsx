"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../lib/cn";
import { usePortalContainer } from "../lib/portal-container";
import { DEFAULT_STAMP, surfaceOf, type SurfaceStamp } from "../lib/surface-stamp";
import { typeClass } from "../lib/type-scale";
import { Panel } from "./panel";

/*
 * Popover — the floating sheet anchored to its trigger.
 *
 * ## Why it was needed (verified, not assumed)
 *
 * Before writing this, `popover`/`tooltip`/`dropdown`/`hover-card` were searched for
 * across `packages`, `javadaba-landing` and `javadaba-web-os`: **zero files**, and no
 * `package.json` in the tree declared the corresponding Radix packages. The ecosystem had
 * no anchored floating surface at all, which is unusual for this tree and is why it's
 * written down here. Whenever something needed to float, either a full-screen `Dialog`
 * was opened —overkill for picking a filter— or it was hand-laid-out, and that already
 * left a scar, first written as a Sonus rule and now global: layout floor L1 in
 * `.harness/rules/interface-psychology.md`, *"nothing that floats is positioned
 * `absolute` inside something that scrolls or slides"*.
 *
 * ## One component with parts, not two components
 *
 * The brief asked for a "plain popover" and an "enriched popover". They're **the same
 * mechanism with different composition**, so here they're composable parts —
 * `PopoverHeader` / `PopoverBody` / `PopoverFooter`— exactly like `Dialog` already solves
 * it in this same package. Two components for the same mechanic is literally what
 * produced the 49 reimplementations.
 *
 * ## The material is NOT new, and it's OPAQUE by default
 *
 * The box is `Panel`, not a reimplemented sheet: the popover contributes the
 * **mechanism** —anchoring, portal, focus, dismissal— and not a material (step 2 of the
 * laziness algorithm).
 *
 * The default material is **`raised`**, and that's not an aesthetic preference: a
 * floating sheet **has to cover what's underneath it**. The first version shipped with
 * `plain`, whose background is `--jd-ink` at 2% —i.e. nearly transparent—, so the page's
 * text read through the popover and looked bad. `raised` is literally "the object at
 * rest" from `Panel`'s contract: opaque `--jd-page` background, hairline and shadow from
 * the `--jd-shadow-*` scale. Which is exactly what a popover is.
 *
 * `glass` is still available and still has its condition: **only when there's something
 * behind it to blur**, which is what axis 1 of
 * `doc://contracts/art-direction` requires of glass. Over a flat page it
 * blurs nothing and costs GPU.
 *
 * ## The portal takes the surface with it, and without this IT DOESN'T SHOW
 *
 * Radix mounts its content in a portal hung off `document.body`. The `--jd-*` tokens are
 * declared on `.jd-surface` / `[data-jd-surface]` / `.jdui`, which are elements on the
 * page — and the portal **is outside of them**. Measured consequence: inside the popover
 * `--jd-page` doesn't exist, `bg-[color:var(--jd-page)]` computes to no color at all, and the
 * sheet comes out **transparent**. It was first "fixed" by switching the material to
 * `raised`, and it still didn't show, because the material was never the problem: the
 * problem is that there's no surface to inherit from inside the portal.
 *
 * The fix is for the surface to **travel with it**: `PopoverTrigger` looks up which one is
 * its own —`closest('[data-jd-surface], .jd-surface, .jdui')`— and `PopoverContent`
 * re-stamps it onto the portal's content. That way the popover paints with the SAME
 * polarity as the page that opened it, without the caller having to remember anything,
 * and without hardcoding a color that would be wrong on three of the four surfaces.
 *
 * If it finds none —a consumer that never declared a surface— it falls back to
 * `jd-surface`, the product one. That's an honest default: better to get the polarity
 * wrong than not show up at all, which is what used to happen.
 *
 * ## Why Radix and not the platform
 *
 * This answers step 3 of the laziness algorithm: HTML's native `popover` and CSS
 * anchoring still don't give reliable placement with flip and shift on the target
 * browsers, and trapped focus, closing on Escape, outside-click, and the trigger's
 * `aria-expanded` all have to be hand-written otherwise. Radix **is already this
 * package's primitives layer** (ten `@radix-ui/*` dependencies): this is the eleventh
 * piece of a family that's already inside, not a new family.
 */

const SurfaceContext = React.createContext<
  readonly [SurfaceStamp, (stamp: SurfaceStamp) => void]
>([DEFAULT_STAMP, () => {}]);

function Popover(props: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
  const state = React.useState<SurfaceStamp>(DEFAULT_STAMP);
  return (
    <SurfaceContext.Provider value={state as readonly [SurfaceStamp, (s: SurfaceStamp) => void]}>
      <PopoverPrimitive.Root {...props} />
    </SurfaceContext.Provider>
  );
}

/**
 * Surface probe: records in context which surface the element lives on, so that
 * `PopoverContent` can repeat it inside the portal.
 *
 * It's carried by **the trigger and the anchor**, the only two parts that render in their
 * actual spot on the page — the content is already in the portal, and from there there's
 * nothing to look at. Both are needed: a popover can open without a trigger, anchored to
 * something else, which is how the dither graphs' hover works.
 */
function useSurfaceProbe<T extends HTMLElement>(
  forwarded: React.ForwardedRef<T>,
): (node: T | null) => void {
  const [, setStamp] = React.useContext(SurfaceContext);

  return React.useCallback(
    (node: T | null) => {
      if (node) setStamp(surfaceOf(node));
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [forwarded, setStamp],
  );
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, forwarded) => (
  <PopoverPrimitive.Trigger ref={useSurfaceProbe(forwarded)} {...props} />
));
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverAnchor = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>
>(({ virtualRef, ...props }, forwarded) => {
  const probe = useSurfaceProbe(forwarded);
  const virtualProbe = useSurfaceProbe<HTMLSpanElement>(null);
  if (!virtualRef) return <PopoverPrimitive.Anchor ref={probe} {...props} />;
  // A virtual anchor (a caret, a selection: JAVA-796) renders no node for the probe to read, so
  // a hidden span stands where the anchor is declared and carries the surface into the portal.
  return (
    <>
      <PopoverPrimitive.Anchor virtualRef={virtualRef} {...props} />
      <span hidden ref={virtualProbe} />
    </>
  );
});
PopoverAnchor.displayName = PopoverPrimitive.Anchor.displayName;

const PopoverClose = PopoverPrimitive.Close;

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /**
   * The sheet's material. `raised` by default: a floating surface has to be OPAQUE.
   * `glass` only when there's something behind it to blur.
   */
  material?: "plain" | "glass" | "raised";
  /**
   * Draws the anchor's arrow. It's a **hard triangle**, no blur and no soft tip: axis 2,
   * hard geometry.
   */
  arrow?: boolean;
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, material = "raised", arrow = false, align = "start", sideOffset = 8, style, children, ...props }, ref) => {
  const [stamp] = React.useContext(SurfaceContext);
  // Inside a Theater frame the sheet is drawn in the frame, not over the page (portal-container.tsx).
  const container = usePortalContainer();

  return (
  <PopoverPrimitive.Portal container={container ?? undefined}>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      // The surface travels to the portal: without this `--jd-page` doesn't exist in here
      // and the sheet comes out transparent. See the header comment.
      data-jd-surface={stamp.kind}
      // `collisionPadding` is what does the *shift*: without it, a popover near the
      // window's edge runs off it. This is the case Sonus's rule 1 describes.
      collisionPadding={12}
      // Inside a modal `Dialog`, the same contract the `Select` listbox keeps (dialog.tsx,
      // FLOATING_LAYER_ATTR): the Dialog's Radix and this Popover's resolve to two copies of the
      // layer stack, so the Dialog neither sees this sheet as a layer above it -- body's
      // `pointer-events: none` reached every option, unclickable -- nor its presses as inside.
      // Found 2026-09-23 with the rich-text toolbar's text-style menu inside Officium's card.
      data-jd-floating-layer=""
      style={{ pointerEvents: "auto", ...style }}
      className={cn(
        "z-[110] outline-none",
        // Short, scale-based entrance that grows out of the trigger (Radix publishes where
        // that is). Under `prefers-reduced-motion` the scale drops out and a fade is left.
        //
        // On THIS node, not on the `Panel`: `data-state` lives here, and Radix only defers
        // the unmount for an animation it can see on the node it unmounts. Until 2026-09-22
        // these classes sat on the Panel, where `data-[state=…]` never matched anything.
        "origin-[var(--radix-popover-content-transform-origin)]",
        "data-[state=open]:animate-jd-pop-in data-[state=closed]:animate-jd-pop-out",
        stamp.className,
        className,
      )}
      {...props}
    >
      {/* The floating sheet is ONE material for every overlay: the white `raised` fill, the 1 px ring
          and the long soft shadow of `--jd-shadow-overlay` (Lib-Overlays). `plain` stays inline. */}
      <Panel
        material={material}
        radius="lg"
        className={cn("min-w-44 overflow-hidden", material === "raised" && "shadow-[var(--jd-shadow-overlay)]")}
      >
        {children}
      </Panel>
      {/* The arrow is painted the sheet's own fill, not the hairline's: it's a tab of the
          sheet itself. With the border color it read as a loose triangle. */}
      {arrow && (
        <PopoverPrimitive.Arrow
          width={14}
          height={7}
          className="fill-[color:var(--jd-raised)] stroke-[color:var(--jd-ink)]/12"
        />
      )}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/**
 * Header of the enriched variant: where the brand mark and label live. The typography is
 * the `kicker` role (Montserrat Italic) in micro small caps with open tracking, which is trait 3
 * of the house signature.
 */
const PopoverHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center gap-3 border-b border-[color:var(--jd-line)] px-4 py-3",
      className,
    )}
    {...props}
  />
);
PopoverHeader.displayName = "PopoverHeader";

const PopoverBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-4 py-3 text-sm text-[color:var(--jd-ink)]", className)} {...props} />
);
PopoverBody.displayName = "PopoverBody";

const PopoverFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2 border-t border-[color:var(--jd-line)] px-4 py-3",
      className,
    )}
    {...props}
  />
);
PopoverFooter.displayName = "PopoverFooter";

/** The header's label: mono, micro small caps, open tracking. */
const PopoverTitle = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(typeClass("kicker"), "leading-none text-[color:var(--jd-faint)]", className)}
    {...props}
  />
);
PopoverTitle.displayName = "PopoverTitle";

const PopoverDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm leading-relaxed text-[color:var(--jd-muted)]", className)} {...props} />
);
PopoverDescription.displayName = "PopoverDescription";

export {
  Popover,
  PopoverAnchor,
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
