import type { Metadata } from "next";
import "./globals.css";

const siteUrl = new URL("https://ollbareun.vercel.app");
const siteTitle = "올바름 | 프리미엄 시설관리 전문기업";
const siteDescription =
  "사람을 향한 신뢰, 공간을 채우는 투명함. 체계적인 교육과 철저한 현장관리로 깨끗하고 안전한 공간을 만듭니다.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "올바름",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased selection:bg-primary/20">
      <body className="app-content min-h-full flex flex-col font-apple bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
