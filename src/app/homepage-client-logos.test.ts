import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/app/page.module.css", "utf8");

describe("homepage client logo sizing", () => {
  it("gives the padded source images enough height to match the PDF artwork", () => {
    expect(stylesheet).toMatch(
      /\.homeClientLogos > div\s*\{[^}]*min-height: 170px;/s,
    );
    expect(stylesheet).toMatch(
      /\.homeClientLogos img\s*\{[^}]*padding: 0 24px;/s,
    );
  });
});
