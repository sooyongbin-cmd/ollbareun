import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manager/manifest.webmanifest",
};

export default function ManagerRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
