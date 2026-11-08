/** A plain browser window for the client's site: three dots, an address, a page. */
export function BrowserFrame({ domain, ink }: { domain: string; ink: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 480,
        borderRadius: 18,
        overflow: "hidden",
        background: "#FFFFFF",
        boxShadow: "0 0 0 1px rgba(17,17,17,.12), 0 20px 40px rgba(17,17,17,.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", columnGap: 10, height: 46, padding: "0 16px", background: "#F2F1EC" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: "rgba(17,17,17,.2)" }} />
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            marginLeft: 10,
            height: 28,
            padding: "0 12px",
            borderRadius: 8,
            background: "#FFFFFF",
            fontSize: 15,
            color: "rgba(17,17,17,.6)",
          }}
        >
          {domain}
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", height: 330, background: "linear-gradient(180deg, #F6EBDD, #E9D3B8)" }}>
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 70,
            bottom: 0,
            width: 160,
            height: 250,
            borderRadius: "80px 80px 0 0",
            background: "linear-gradient(180deg, #FFFFFF, #FDF3D9)",
            boxShadow: `inset 0 0 0 10px ${ink}`,
          }}
        />
        <div style={{ display: "flex", position: "absolute", right: 60, bottom: 60, width: 150, height: 18, borderRadius: 9, background: ink }} />
        <div style={{ display: "flex", position: "absolute", right: 60, bottom: 96, width: 110, height: 18, borderRadius: 9, background: `${ink}59` }} />
      </div>
    </div>
  );
}
