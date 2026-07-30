import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "(주)올바름 관리자",
  manifest: "/manager/manifest.webmanifest",
  icons: {
    icon: "/manager-icon.ico",
  },
};

export default function ManagerRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
