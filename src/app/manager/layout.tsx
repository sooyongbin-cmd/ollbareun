import type { Metadata } from "next";
import ManagerThemeProvider from "./manager-theme-provider";
import "./manager-sections.css";

export const metadata: Metadata = {
  title: "주식회사 올바름",
  manifest: "/manager/manifest.webmanifest",
  icons: {
    icon: "/icons/logo_only_color.svg",
    apple: "/icons/logo_only_color-180.png",
  },
};

export default function ManagerRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ManagerThemeProvider initialTheme="system">
      {children}
    </ManagerThemeProvider>
  );
}
