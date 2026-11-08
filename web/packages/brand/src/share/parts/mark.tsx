import { MARK_ASPECT, MARK_DIAMONDS } from "../../mark-data";

/** The Javadaba mark (Library 11): nine diamonds and the black one. `width` is the whole canvas. */
export function ShareMark({ width, black = "#000000" }: { width: number; black?: string }) {
  const height = width / MARK_ASPECT;
  const px = (share: number, of: number) => Math.round(share * of) / 100;
  const diamond = (left: number, top: number, w: number, h: number, background: string, radius = 0) => (
    <div
      key={`${left}-${top}`}
      style={{
        position: "absolute",
        display: "flex",
        left: px(left, width),
        top: px(top, height),
        width: px(w, width),
        height: px(h, height),
        background,
        borderRadius: radius,
        transform: "rotate(45deg)",
      }}
    />
  );
  return (
    <div style={{ display: "flex", position: "relative", width, height, flex: "none" }}>
      {MARK_DIAMONDS.map((d) => diamond(d.left, d.top, 14.14, 35.36, d.color))}
      {diamond(65.86, 14.64, 28.28, 70.71, black, 2)}
    </div>
  );
}
