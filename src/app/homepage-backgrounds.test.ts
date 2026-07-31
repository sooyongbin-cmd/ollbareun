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
});
