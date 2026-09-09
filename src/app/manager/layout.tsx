import type { Metadata } from "next";
import { getManagerTheme } from "@/lib/system-configs";
import ManagerThemeProvider from "./manager-theme-provider";

export const metadata: Metadata = {
  title: "주식회사 올바름",
  manifest: "/manager/manifest.webmanifest",
  icons: {
    icon: "/manager-icon.ico",
  },
};

export default async function ManagerRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialTheme = await getManagerTheme();

  return (
    <ManagerThemeProvider initialTheme={initialTheme}>
      {children}
    </ManagerThemeProvider>
  );
}
