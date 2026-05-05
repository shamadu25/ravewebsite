import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "RaveSoft Digital Solutions";
  const subtitle =
    searchParams.get("subtitle") ??
    "Software, Automation & Digital Transformation for Businesses Across Africa";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #050816 0%, #0d1b4b 50%, #0a2466 100%)",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
          }}
        />
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.4)",
            borderRadius: "999px",
            padding: "6px 18px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#3b82f6",
            }}
          />
          <span style={{ color: "#93c5fd", fontSize: "16px", fontWeight: 600 }}>
            ravesoftsolutions.com
          </span>
        </div>
        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? "44px" : "56px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: "24px",
            maxWidth: "900px",
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </div>
        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#94a3b8",
            lineHeight: 1.5,
            maxWidth: "780px",
            fontWeight: 400,
          }}
        >
          {subtitle}
        </div>
        {/* Footer row */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            left: "80px",
            right: "80px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 900,
                color: "#fff",
              }}
            >
              R
            </div>
            <span style={{ color: "#e2e8f0", fontSize: "18px", fontWeight: 700 }}>
              RaveSoft Digital Solutions
            </span>
          </div>
          <span style={{ color: "#475569", fontSize: "16px" }}>
            Ghana · Nigeria · Kenya · Africa
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
