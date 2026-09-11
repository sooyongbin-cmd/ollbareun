import type { Metadata } from "next";
import { getManagerTheme, isSystemConfigEnabled } from "@/lib/system-configs";
import { PasskeyFeatureProvider } from "@/components/passkey-feature-provider";
import ManagerThemeProvider from "./manager-theme-provider";

export const metadata: Metadata = {
  title: "주식회사 올바름",
  manifest: "/manager/manifest.webmanifest",
  icons: {
    icon: "/icons/logo_only_color.svg",
    apple: "/icons/logo_only_color-180.png",
  },
};

export default async function ManagerRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [initialTheme, passkeyEnabled] = await Promise.all([
    getManagerTheme(),
    isSystemConfigEnabled("system_passkey"),
  ]);

  return (
    <ManagerThemeProvider initialTheme={initialTheme}>
      <PasskeyFeatureProvider enabled={passkeyEnabled}>{children}</PasskeyFeatureProvider>
    </ManagerThemeProvider>
  );
}
