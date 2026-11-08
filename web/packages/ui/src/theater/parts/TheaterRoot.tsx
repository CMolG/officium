"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import type { TheaterRootProps } from "../types";
import { cx } from "../constants";
import { STYLES } from "../styles";
import { TheaterContext } from "../hooks/useTheater";
import { useTheaterController } from "../hooks/useTheaterController";
import { TheaterDesk } from "./TheaterDesk";

export function TheaterRoot(props: TheaterRootProps) {
  const { desk, className, style, children } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controller = useTheaterController(props, rootRef);

  const rootStyle = useMemo(
    () =>
      ({
        ...style,
        "--theater-transition": `${controller.transition}ms`,
      }) as CSSProperties,
    [style, controller.transition],
  );

  return (
    <div
      ref={rootRef}
      className={cx("theater", className)}
      data-playing={controller.playing}
      role="region"
      aria-label={controller.labels.region}
      style={rootStyle}
    >
      {/* `href` + `precedence`: React hoists it into the head and writes it once per document,
          however many Theaters the page mounts: inline it was 7.6 KB per instance, four
          times on the landing's front page (JAVA-192). Same pattern as the other hoisted `<style href>` pieces. */}
      <style href="jd-theater" precedence="default">
        {STYLES}
      </style>
      <TheaterDesk palette={desk} />
      <TheaterContext.Provider value={controller}>
        <div className="theater__inner">{children}</div>
      </TheaterContext.Provider>
    </div>
  );
}
