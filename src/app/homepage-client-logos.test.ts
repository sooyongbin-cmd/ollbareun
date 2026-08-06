import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/app/page.module.css", "utf8");

describe("homepage client logo sizing", () => {
  it("gives the padded source images enough height to match the PDF artwork", () => {
    expect(stylesheet).toMatch(
      /\.homeClientLogos > div\s*\{[^}]*min-height: 10.625rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.homeClientLogos img\s*\{[^}]*padding: 0 1.5rem;/s,
    );
  });

  it("draws only the top and bottom rules shown in the PDF", () => {
    const gridRule = stylesheet.match(/\.homeClientLogos\s*\{([^}]*)\}/s)?.[1];
    const cellRule = stylesheet.match(/\.homeClientLogos > div\s*\{([^}]*)\}/s)?.[1];

    expect(gridRule).toContain("border-top: 1px solid var(--home-line);");
    expect(gridRule).toContain("border-bottom: 1px solid var(--home-line);");
    expect(gridRule).not.toContain("border-left");
    expect(gridRule).not.toContain("border-right");
    expect(cellRule).not.toContain("border");
  });
});

describe("client page logo sizing", () => {
  it("matches the logo-to-heading scale in the PDF", () => {
    expect(stylesheet).toMatch(
      /\.clientGroups > div > h3\s*\{[^}]*font-size: 0.8125rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.logoGrid > div\s*\{[^}]*height: 8.125rem;/s,
    );
  });
});
