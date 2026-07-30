import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Metadata, ResolvingMetadata } from "next";
import { getKakaoOpenGraphMetadata } from "@/lib/system-configs";
import GuardLayout, { dynamic, generateMetadata } from "./layout";
import { guardFontZoomStorageKey, guardZoomStorageKey } from "./guard-zoom";

vi.mock("@/lib/system-configs", () => ({
  defaultKakaoOpenGraphMetadata: {
    title: "기본 카카오 제목",
    description: "기본 카카오 설명",
  },
  getKakaoOpenGraphMetadata: vi.fn(),
}));

vi.mock("./guard-install-prompt", () => ({
  default: () => <div data-testid="guard-install-prompt" />,
}));

vi.mock("./in-app-browser-checker", () => ({
  default: () => <div data-testid="in-app-browser-checker" />,
}));

function resolveMetadata(metadata: Metadata) {
  return Promise.resolve(metadata) as unknown as ResolvingMetadata;
}

describe("guard layout zoom scope", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(getKakaoOpenGraphMetadata).mockResolvedValue({
      title: "설정한 카카오 제목",
      description: "설정한 카카오 설명",
    });
  });

  it("uses the configured Kakao title and description while preserving parent social metadata", async () => {
    const parentMetadata: Metadata = {
      openGraph: {
        siteName: "올바름",
        images: ["/opengraph-image"],
      },
      twitter: {
        card: "summary_large_image",
        images: ["/opengraph-image"],
      },
    };

    const metadata = await generateMetadata({}, resolveMetadata(parentMetadata));

    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("(주)올바름 근무자");
    expect(metadata.manifest).toBe("/guard/manifest.webmanifest");
    expect(metadata.openGraph).toMatchObject({
      siteName: "올바름",
      images: ["/opengraph-image"],
      url: "/guard",
      title: "설정한 카카오 제목",
      description: "설정한 카카오 설명",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/opengraph-image"],
      title: "설정한 카카오 제목",
      description: "설정한 카카오 설명",
    });
  });

  it("falls back to the current metadata when the settings lookup fails", async () => {
    vi.mocked(getKakaoOpenGraphMetadata).mockRejectedValue(new Error("database unavailable"));

    const metadata = await generateMetadata({}, resolveMetadata({}));

    expect(metadata.openGraph).toMatchObject({
      title: "기본 카카오 제목",
      description: "기본 카카오 설명",
    });
  });

  it("wraps all guard content in the zoom scope", () => {
    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    const scope = screen.getByTestId("guard-zoom-scope");
    expect(scope).toHaveClass("guard-zoom-scope");
    expect(scope).toHaveClass("guard-font-scale");
    expect(scope).toHaveStyle({ "--guard-zoom-scale": "1" });
    expect(scope).toHaveStyle({ "--guard-font-scale": "1" });
    expect(screen.getByText("Guard child")).toBeInTheDocument();
    expect(screen.getByTestId("guard-install-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("in-app-browser-checker")).toBeInTheDocument();
  });

  it("applies the stored guard zoom scale", () => {
    window.localStorage.setItem(guardZoomStorageKey, "125");

    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    expect(screen.getByTestId("guard-zoom-scope")).toHaveStyle({ "--guard-zoom-scale": "1.25" });
  });

  it("applies the stored guard font zoom scale independently from screen zoom", () => {
    window.localStorage.setItem(guardZoomStorageKey, "110");
    window.localStorage.setItem(guardFontZoomStorageKey, "125");

    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    expect(screen.getByTestId("guard-zoom-scope")).toHaveStyle({
      "--guard-zoom-scale": "1.1",
      "--guard-font-scale": "1.25",
    });
  });
});
