import { ImageResponse } from "next/og";

export const alt =
  "Roseville Dental Academy — Dental Assisting and Certification Training in Roseville, California";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #16344f 0%, #2472a9 65%, #4a8fc4 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#ffffff",
              display: "block",
            }}
          />
          Roseville Dental Academy
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 80,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              maxWidth: 980,
            }}
          >
            Dental Assisting & Certification Training in Roseville, CA
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              opacity: 0.92,
              maxWidth: 920,
            }}
          >
            Hands-on classes for Dental Assisting, BLS/CPR, Infection Control,
            Radiation Safety, Coronal Polish, and Sealants.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            opacity: 0.85,
          }}
        >
          <span>rosevilledentalacademy.com</span>
          <span>9-week program · California Dental Board approved</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
