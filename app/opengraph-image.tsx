import { ImageResponse } from "next/og";

export const alt = "Squeeze - compress PNG and JPG images to WebP or SVG";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          color: "#ececef",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#ececef" />
            <path
              d="M10 8.5 16 14.5 22 8.5M10 23.5 16 17.5 22 23.5"
              fill="none"
              stroke="#09090b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 600 }}>Squeeze</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 48, lineHeight: 1.1, letterSpacing: -2 }}>
          Compress images for the web.
        </div>
        <div style={{ fontSize: 32, color: "#84848e", marginTop: 28 }}>
          PNG and JPG to WebP or SVG, in bulk. Runs in your browser.
        </div>
      </div>
    ),
    size,
  );
}
