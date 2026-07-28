import {
  defaultKakaoOpenGraphMetadata,
  getKakaoOpenGraphMetadata,
} from "@/lib/system-configs";
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
    title: "사회적기업 올바름",
    manifest: "/guard/manifest.webmanifest",
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

export default function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GuardZoomScope>
      {children}
      <GuardInstallPrompt />
      <InAppBrowserChecker />
    </GuardZoomScope>
  );
}
