import type { Metadata } from "next";
import "./globals.css";

const siteUrl = new URL("https://ollbareun.vercel.app");
const siteTitle = "(주)올바름";
const siteDescription =
  "근로자 파견, 건물·시설물 종합 관리, 방역·소독까지 사람과 공간을 위한 현장 운영 서비스를 제공합니다.";

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
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
