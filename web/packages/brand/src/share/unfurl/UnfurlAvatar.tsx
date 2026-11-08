import { INK } from "./look";

/** The sender's letter in a lilac square (round on a community chat), as the board draws every avatar. */
export function UnfurlAvatar({ name, round = false, size = 40 }: { name: string; round?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flex: "none",
        borderRadius: round ? 9999 : 10,
        background: "#D9D4F5",
        color: INK,
        fontWeight: 800,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
