import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#090b10", color: "#f4f1ea", padding: "80px" }}>
        <div style={{ color: "#d4b483", fontSize: 28, letterSpacing: 4 }}>BASTION</div>
        <div style={{ marginTop: 24, fontSize: 72, lineHeight: 1.05 }}>Defensive control plane</div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#b7b1a6" }}>Passive checks, a bot ledger, and public threat records.</div>
      </div>
    ),
    size,
  );
}
