import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "올바름 관리시스템",
  description: "현장을 위한 가장 완벽한 근태 관리 Phase 1 MVP",
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
