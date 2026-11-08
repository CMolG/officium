import { toolFor, TOOL_KIND_LABEL } from "../tools";
import type { CardContext } from "./context";
import { Header } from "./parts/header";
import { ImageTile } from "./parts/image-tile";
import { ShareMark } from "./parts/mark";
import { Wordmark } from "./parts/wordmark";

/** The tile and the product's name: a wordmark, or for an API and a tiny tool its name and what it is. */
export function ProductHeader({ ctx, color = "#111111" }: { ctx: CardContext; color?: string }) {
  const tool = toolFor(ctx.slug);
  if (ctx.slug === "javadaba") {
    // The umbrella brand's tile is the mark itself, on white.
    return (
      <Header>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 104,
            height: 104,
            borderRadius: 25,
            background: "#FFFFFF",
            boxShadow: "0 10px 26px rgba(17,17,17,.14), 0 0 0 1px rgba(17,17,17,.06)",
          }}
        >
          <ShareMark width={84} />
        </div>
        <Wordmark name={ctx.name} ink={ctx.ink} color={color} />
      </Header>
    );
  }
  if (!tool) {
    return (
      <Header>
        <ImageTile src={ctx.tile} />
        <Wordmark name={ctx.name} ink={ctx.ink} color={color} />
      </Header>
    );
  }
  return (
    <Header>
      <img src={ctx.tile} width={104} height={104} alt="" style={{ width: 104, height: 104 }} />
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", columnGap: 18 }}>
        <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -0.5, color }}>{ctx.name}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 42,
            padding: "0 15px",
            borderRadius: 9999,
            background: "rgba(17,17,17,.07)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 0.44,
            color: "#111111",
          }}
        >
          {TOOL_KIND_LABEL[tool.kind]}
        </div>
      </div>
    </Header>
  );
}
