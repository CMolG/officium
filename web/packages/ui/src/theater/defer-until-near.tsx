"use client";

import { useEffect, useRef, useState, type ComponentType, type HTMLAttributes } from "react";

/**
 * How far ahead of the viewport a deferred scene starts loading: one screen, so its code has
 * arrived by the time a visitor scrolling at reading speed reaches the frame.
 */
const NEAR = "100% 0px";

/**
 * A scene that mounts only once its frame is within a screen of the viewport. Until then the
 * layer stays empty: Theater has already drawn the window at its final size, so the scene
 * arriving moves nothing around it. Rendered empty on the server too, which is what keeps the
 * scene's code out of the page's preloads. `placeholderClassName` reserves the space of a
 * component that is itself deferred, so its frame arriving moves nothing either.
 * `placeholderAttributes` labels that empty space (a landmark, say), so the page's structure is
 * the same before and after the scene arrives.
 */
export function deferUntilNear<P extends object>(
  Stage: ComponentType<P>,
  placeholderClassName = "h-full",
  placeholderAttributes?: (props: P) => HTMLAttributes<HTMLDivElement>,
): ComponentType<P> {
  return function DeferredStage(props: P) {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setNear(true);
          io.disconnect();
        },
        { rootMargin: NEAR },
      );
      io.observe(el);
      return () => io.disconnect();
    }, []);
    if (near) return <Stage {...props} />;
    return <div ref={ref} className={placeholderClassName} {...placeholderAttributes?.(props)} />;
  };
}
