import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "사회적기업 올바름 — 프리미엄 시설관리 전문기업";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const pretendardBold = await readFile(
    join(
      process.cwd(),
      "public",
      "Pretendard-1.3.9",
      "web",
      "static",
      "woff-subset",
      "Pretendard-Bold.subset.woff",
    ),
  );

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg, #003f7f 0%, #0066cc 55%, #2f8de4 100%)",
          color: "white",
          fontFamily: "Pretendard",
          padding: "68px 76px",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: 9999,
            right: -160,
            top: -240,
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: 9999,
            right: 60,
            bottom: -220,
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "white",
              boxShadow: "0 14px 34px rgba(0, 39, 79, 0.25)",
            }}
          >
            <svg width="50" height="50" viewBox="0 0 50 50">
              <rect width="50" height="50" rx="14" fill="#0066cc" />
              <path
                d="M13 25L21 33L37 16"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 24,
            }}
          >
            <div style={{ display: "flex", fontSize: 38, letterSpacing: -1 }}>올바름</div>
            <div
              style={{
                display: "flex",
                marginTop: 7,
                color: "#d8ebff",
                fontSize: 17,
                letterSpacing: 2.4,
              }}
            >
              SOCIAL ENTERPRISE
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 74,
            fontSize: 64,
            lineHeight: 1.22,
            letterSpacing: -2.4,
          }}
        >
          <div style={{ display: "flex" }}>사람을 향한 신뢰,</div>
          <div style={{ display: "flex" }}>공간을 채우는 투명함.</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
            color: "#e8f3ff",
            fontSize: 25,
            letterSpacing: -0.5,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 44,
              height: 4,
              marginRight: 16,
              borderRadius: 9999,
              background: "#8ec8ff",
            }}
          />
          프리미엄 시설관리 전문기업
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Pretendard",
          data: pretendardBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
