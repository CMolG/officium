export function ImageTile({ src, size = 104 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        boxShadow: "0 10px 26px rgba(17,17,17,.14), 0 0 0 1px rgba(17,17,17,.06)",
      }}
    />
  );
}
