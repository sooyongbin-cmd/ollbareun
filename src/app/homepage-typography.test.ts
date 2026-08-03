import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/app/page.module.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

describe("homepage Figma typography", () => {
  it("loads the existing Pretendard variable font with its real family name", () => {
    expect(globals).toContain('font-family: "Pretendard Variable";');
    expect(globals).toContain("--font-pretendard: \"Pretendard Variable\"");
    expect(stylesheet).toContain('font-family: "Pretendard Variable"');
  });

  it("matches the Figma hero title typography", () => {
    expect(stylesheet).toMatch(
      /\.heroContent h1\s*\{[^}]*font-size: 67\.31px;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(/\.heroContent h1 strong\s*\{[^}]*font-weight: 800;/s);
  });

  it("matches the Figma main landing section typography", () => {
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading > p,[\s\S]*\.homeClientSection \.sectionHeading > p\s*\{[^}]*font-size: 26px;[^}]*font-weight: 500;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading h2,[\s\S]*\.homeClientSection \.sectionHeading h2\s*\{[^}]*font-size: 43px;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading > span,[\s\S]*\.homeClientSection \.sectionHeading > span\s*\{[^}]*font-size: 21px;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
  });

  it("matches the Figma service card, action link, header, and footer sizes", () => {
    expect(stylesheet).toMatch(
      /\.serviceCard h3\s*\{[^}]*font-size: 19px;[^}]*font-weight: 700;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.serviceCard p\s*\{[^}]*font-size: 15px;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.moreLink\s*\{[^}]*font-size: 15\.66px;[^}]*font-weight: 700;[^}]*letter-spacing: 0;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.desktopNav\s*\{[^}]*font-size: 16px;[^}]*font-weight: 500;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.footerGrid > div\s*\{[^}]*font-size: 16px;[^}]*font-weight: 400;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.footerBottom\s*\{[^}]*font-size: 12px;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.05em;[^}]*line-height: normal;/s,
    );
  });
});
