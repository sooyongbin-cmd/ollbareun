import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/app/page.module.css", "utf8");

describe("homepage PDF background colors", () => {
  it("uses the exact solid section colors from the homepage mockup", () => {
    expect(stylesheet).toContain("--home-trust-background: #ffffff;");
    expect(stylesheet).toContain("--home-service-background: #f9f9f8;");
    expect(stylesheet).toContain("--home-client-background: #ffffff;");
    expect(stylesheet).toContain("--home-values-background: #315da6;");
    expect(stylesheet).toContain("--home-footer-background: #dcdbda;");
  });

  it("reuses the alternating PDF background for matching sections", () => {
    expect(stylesheet).toMatch(
      /\.socialSection\s*\{[^}]*background: var\(--home-service-background\);/s,
    );
    expect(stylesheet).toMatch(
      /\.detailSection\s*\{[^}]*background: var\(--home-service-background\);/s,
    );
  });

  it("rounds the history image at the PDF's top-left and bottom-right corners", () => {
    expect(stylesheet).toMatch(
      /\.historyImage\s*\{[^}]*border-radius: 55px 0 55px 0;/s,
    );
  });

  it("keeps the about, service, and client hero images the same height", () => {
    expect(stylesheet).toMatch(
      /\.aboutHero,[\s\S]*\.serviceHero,[\s\S]*\.clientHero\s*\{[^}]*min-height: 500px;/s,
    );
  });

  it("centers the about, service, and client hero copy", () => {
    expect(stylesheet).toMatch(
      /\.aboutHero > div:last-child,[\s\S]*\.serviceHero > div:last-child,[\s\S]*\.clientHero > div:last-child\s*\{[^}]*text-align: center;/s,
    );
  });

  it("centers the left-aligned hero copy as a text block", () => {
    expect(stylesheet).toMatch(
      /\.aboutHero h1,[\s\S]*\.serviceHero h1,[\s\S]*\.clientHero h1\s*\{[^}]*width: fit-content;[^}]*margin: 0 auto;/s,
    );
  });

  it("centers the main hero title in the viewport", () => {
    expect(stylesheet).toMatch(
      /\.heroContent\s*\{[^}]*width: 100%;[^}]*padding-left: 0;[^}]*text-align: center;/s,
    );
  });

  it("applies a 1px solid black border to certificate images", () => {
    expect(stylesheet).toMatch(
      /\.certificateImages img\s*\{[^}]*border: 1px solid black;/s,
    );
  });
});
