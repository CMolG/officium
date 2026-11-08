"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";
import { toggleVariants } from "./toggle";

/*
 * ToggleGroup — toggles on a stone tray (Lib-Controls § Toggle · ToggleGroup · Slider). A single
 * choice (alignment, view) or a multiple one (text style); the pressed item fills with ink.
 * A multiple group announces how many are on, in words ("Bold and italic on"), through a polite
 * live region, because a pressed state that only changes a fill is silent to a screen reader.
 */

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

/** "Bold and italic on", "Bold, italic and underline on", "None on". */
function describeOn(names: string[]): string {
  if (names.length === 0) return "None on";
  if (names.length === 1) return `${names[0]} on`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)!.toLowerCase()} on`;
}

function useOnAnnouncement(enabled: boolean) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    const observer = new MutationObserver(() => {
      const names = Array.from(root.querySelectorAll<HTMLElement>('[data-state="on"]')).map(
        (item) => item.getAttribute("aria-label") ?? item.textContent ?? "",
      );
      setStatus(describeOn(names));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-state"], subtree: true });
    return () => observer.disconnect();
  }, [enabled]);
  return { rootRef, status };
}

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => {
  const { rootRef, status } = useOnAnnouncement(props.type === "multiple");
  const setRefs = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  return (
    <>
      <ToggleGroupPrimitive.Root
        ref={setRefs}
        className={cn("inline-flex flex-row items-center gap-1 rounded-xl bg-[color:var(--jd-card)] p-1 [--toggle-rest:var(--jd-card)]", className)}
        {...props}
      >
        <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
      </ToggleGroupPrimitive.Root>
      {props.type === "multiple" ? (
        <span role="status" className="sr-only">
          {status}
        </span>
      ) : null}
    </>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      data-jd-component="ToggleGroupItem"
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
