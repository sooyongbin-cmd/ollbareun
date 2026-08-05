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
      /\.operationSection \.sectionHeading > p\s*\{[^}]*font-size: 26px;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.serviceCard h3\s*\{[^}]*font-size: 19px;[^}]*font-weight: 700;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.serviceCard p\s*\{[^}]*font-size: 15px;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: 21px;/s,
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

  it("matches the Figma about-page body typography", () => {
    expect(stylesheet).toMatch(/\.aboutPage \.aboutHero h1\s*\{[^}]*font-size: 53px;[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading h2\s*\{[^}]*font-size: 43px;[^}]*line-height: 54px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.values \.sectionHeading h2\s*\{[^}]*font-size: 49px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.stats strong\s*\{[^}]*font-size: 59\.34px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.timeline time\s*\{[^}]*font-size: 40\.12px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.valueGrid strong\s*\{[^}]*font-size: 74px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.socialGrid h3\s*\{[^}]*font-size: 25\.78px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.contactCopy h2\s*\{[^}]*font-size: 43px;[^}]*line-height: 54px;/s);
  });

  it("matches the Figma services-page body typography", () => {
    expect(stylesheet).toMatch(/\.servicesPage \.serviceHero h1\s*\{[^}]*font-size: 53px;[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading > p\s*\{[^}]*font-size: 26px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading h2\s*\{[^}]*font-size: 43px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading > span\s*\{[^}]*font-size: 21px;[^}]*line-height: 28\.35px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout > h3\s*\{[^}]*font-size: 47\.17px;[^}]*line-height: 63px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.detailMessage\s*\{[^}]*font-size: 35px;[^}]*line-height: 47px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid h3\s*\{[^}]*font-size: 25\.78px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid p\s*\{[^}]*font-size: 19\.64px;[^}]*line-height: 29px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout h4\s*\{[^}]*font-size: 21px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout li p\s*\{[^}]*font-size: 16px;[^}]*line-height: normal;/s);
  });

  it("matches the Figma clients-page body typography", () => {
    expect(stylesheet).toMatch(/\.clientsPage \.clientHero h1\s*\{[^}]*font-size: 53px;[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > p\s*\{[^}]*font-size: 26px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading h2\s*\{[^}]*font-size: 43px;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > span\s*\{[^}]*font-size: 21px;[^}]*line-height: 28\.35px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientGroups > div > h3\s*\{[^}]*font-size: 17px;[^}]*line-height: normal;/s);
  });
});
