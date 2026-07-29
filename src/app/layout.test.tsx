import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "./layout";

describe("root layout", () => {
  it("applies the shared design scope to every application screen", () => {
    const layout = RootLayout({ children: <main>화면 내용</main> });
    const body = layout.props.children;

    expect(body.props.className).toContain("bg-background");
    expect(body.props.className).toContain("text-foreground");
  });

  it("provides complete social sharing metadata", () => {
    expect(metadata.metadataBase?.toString()).toBe("https://ollbareun.vercel.app/");
    expect(metadata.title).toBe("주식회사 올바름 | 현장의 기준을 바로 세우는 운영 파트너");
    expect(metadata.description).toContain("근로자 파견");
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "ko_KR",
      url: "/",
      siteName: "올바름",
      title: "주식회사 올바름 | 현장의 기준을 바로 세우는 운영 파트너",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "주식회사 올바름 | 현장의 기준을 바로 세우는 운영 파트너",
    });
  });
});
