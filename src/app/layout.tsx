import type { Metadata } from "next";
import { flexGapBootstrap } from "../lib/flex-gap-bootstrap";
import "./globals.css";

const siteUrl = new URL("https://www.olbareum.com");
const siteTitle = "주식회사 올바름";
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
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1180,
        height: 594,
        alt: siteTitle,
      },
    ],
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
    <html lang="ko" className="h-full antialiased selection:bg-primary/20" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <script data-app-layout="" dangerouslySetInnerHTML={{ __html: flexGapBootstrap }} />
        {children}
      </body>
    </html>
  );
}
