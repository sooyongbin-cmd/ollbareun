import {
  defaultKakaoOpenGraphMetadata,
  getKakaoOpenGraphMetadata,
  isSystemConfigEnabled,
} from "@/lib/system-configs";
import { PasskeyFeatureProvider } from "@/components/passkey-feature-provider";
import type { Metadata, ResolvingMetadata } from "next";
import GuardInstallPrompt from "./guard-install-prompt";
import InAppBrowserChecker from "./in-app-browser-checker";
import GuardZoomScope from "./guard-zoom-scope";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  _: object,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  let kakaoMetadata = defaultKakaoOpenGraphMetadata;

  try {
    kakaoMetadata = await getKakaoOpenGraphMetadata();
  } catch {
    // Keep the public guard page available when the settings store is unavailable.
  }

  const parentMetadata = await parent;

  return {
    title: "주식회사 올바름",
    manifest: "/guard/manifest.webmanifest",
    icons: { icon: "/icons/logo_only_color.svg", apple: "/icons/logo_only_color-180.png" },
    openGraph: {
      ...parentMetadata.openGraph,
      url: "/guard",
      title: kakaoMetadata.title,
      description: kakaoMetadata.description,
    },
    twitter: {
      ...parentMetadata.twitter,
      title: kakaoMetadata.title,
      description: kakaoMetadata.description,
    },
  };
}

export default async function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const passkeyEnabled = await isSystemConfigEnabled("system_passkey");

  return (
    <GuardZoomScope>
      <PasskeyFeatureProvider enabled={passkeyEnabled}>{children}</PasskeyFeatureProvider>
      <GuardInstallPrompt />
      <InAppBrowserChecker />
    </GuardZoomScope>
  );
}
