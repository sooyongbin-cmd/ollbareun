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
      /\.heroContent h1\s*\{[^}]*font-size: 4.206875rem;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(/\.heroContent h1 strong\s*\{[^}]*font-weight: 800;/s);
  });

  it("matches the Figma main landing section typography", () => {
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading > p,[\s\S]*\.homeClientSection \.sectionHeading > p\s*\{[^}]*font-size: 1.625rem;[^}]*font-weight: 500;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading h2,[\s\S]*\.homeClientSection \.sectionHeading h2\s*\{[^}]*font-size: 2.6875rem;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading > span,[\s\S]*\.homeClientSection \.sectionHeading > span\s*\{[^}]*font-size: 1.3125rem;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
  });

  it("matches the Figma service card, action link, header, and footer sizes", () => {
    expect(stylesheet).toMatch(
      /\.operationSection \.sectionHeading > p\s*\{[^}]*font-size: 1.625rem;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.serviceCard h3\s*\{[^}]*font-size: 1.1875rem;[^}]*font-weight: 700;[^}]*letter-spacing: -0\.03em;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.serviceCard p\s*\{[^}]*font-size: 0.9375rem;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.03em;[^}]*line-height: 1.3125rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.moreLink\s*\{[^}]*font-size: 0.97875rem;[^}]*font-weight: 700;[^}]*letter-spacing: 0;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.desktopNav\s*\{[^}]*font-size: 1rem;[^}]*font-weight: 500;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.footerGrid > div\s*\{[^}]*font-size: 1rem;[^}]*font-weight: 400;[^}]*line-height: normal;/s,
    );
    expect(stylesheet).toMatch(
      /\.footerBottom\s*\{[^}]*font-size: 0.75rem;[^}]*font-weight: 400;[^}]*letter-spacing: -0\.05em;[^}]*line-height: normal;/s,
    );
  });

  it("matches the Figma about-page body typography", () => {
    expect(stylesheet).toMatch(/\.aboutPage \.aboutHero h1\s*\{[^}]*font-size: 3.3125rem;[^}]*line-height: 4.375rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading h2\s*\{[^}]*font-size: 2.6875rem;[^}]*line-height: 3.375rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.values \.sectionHeading h2\s*\{[^}]*font-size: 3.0625rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.stats strong\s*\{[^}]*font-size: 3.70875rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.timeline time\s*\{[^}]*font-size: 2.5075rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.valueGrid strong\s*\{[^}]*font-size: 4.625rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.socialGrid h3\s*\{[^}]*font-size: 1.61125rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.contactSection \.contactCopy h2\s*\{[^}]*font-size: 2.6875rem;[^}]*line-height: 3.375rem;/s);
  });

  it("aligns the landing contact heading and details to the same top edge", () => {
    expect(stylesheet).toMatch(/\.contactSection\s*\{\s*align-items: start;/s);
    expect(stylesheet).toMatch(
      /\.contactSection \.contactCopy h2\s*\{[^}]*font-size: 2.6875rem;[^}]*line-height: 3.375rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.contactSection \.contactCopy address > span,[\s\S]*\.contactSection \.contactCopy address > a\s*\{[^}]*grid-template-columns: 0.8125rem 5.875rem minmax\(0, 1fr\);[^}]*column-gap: 2.5rem;/s,
    );
  });

  it("matches the Figma services-page body typography", () => {
    expect(stylesheet).toMatch(/\.servicesPage \.serviceHero h1\s*\{[^}]*font-size: 3.3125rem;[^}]*line-height: 4.375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading > p\s*\{[^}]*font-size: 1.625rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading h2\s*\{[^}]*font-size: 2.6875rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.sectionHeading > span\s*\{[^}]*font-size: 1.3125rem;[^}]*line-height: 1.771875rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout > h3\s*\{[^}]*font-size: 2.948125rem;[^}]*line-height: 3.9375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.detailMessage\s*\{[^}]*font-size: 2.1875rem;[^}]*line-height: 2.9375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid h3\s*\{[^}]*font-size: 1.61125rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid p\s*\{[^}]*font-size: 1.2275rem;[^}]*line-height: 1.8125rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout h4\s*\{[^}]*font-size: 1.3125rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout li p\s*\{[^}]*font-size: 1rem;[^}]*line-height: normal;/s);
  });

  it("matches the Figma services mobile geometry and typography", () => {
    expect(stylesheet).toMatch(
      /\.servicesPage \.teamImage,[\s\S]*\.servicesPage \.detailBanner\s*\{\s*height: 9.375rem;\s*aspect-ratio: auto;/s,
    );
    expect(stylesheet).toMatch(
      /\.servicesPage \.operationLayout > h3\s*\{[^}]*font-size: 1.5rem;[^}]*letter-spacing: -0.045rem;[^}]*line-height: 1.8125rem;[^}]*text-align: center;/s,
    );
    expect(stylesheet).toMatch(
      /\.operationStep\s*\{[^}]*min-height: 6.25rem;[^}]*padding: 0.875rem 1rem 0.875rem 4.25rem;[^}]*border-radius: 1.25rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.operationBadge\s*\{[^}]*left: -1.5rem;[^}]*width: 4.75rem;[^}]*height: 4.75rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.servicesPage \.dispatchSection \.detailMessage\s*\{[^}]*font-weight: 500;[^}]*line-height: 1.4375rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.servicesPage \.facilityGrid article\s*\{[^}]*display: block;[^}]*height: 11.875rem;[^}]*padding: 1.675rem 1.78125rem 1.75rem 1.9125rem;/s,
    );
  });

  it("matches the Page 3 Mask group image size matrix", () => {
    expect(stylesheet).toMatch(
      /\/\* Page 3 image size matrix: dimensions rounded from the Page3 Mask group sheet\. \*\/[\s\S]*?\.servicesPage \.operationSection \.teamImage\s*\{\s*width: 1182px;\s*height: 228px;\s*\}[\s\S]*?\.servicesPage \.dispatchSection \.detailBanner,[\s\S]*?\.servicesPage \.disinfectionSection \.detailBanner\s*\{\s*width: 1182px;\s*height: 230px;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 1025px\) and \(max-width: 1280px\)[\s\S]*?\.servicesPage \.operationSection \.teamImage\s*\{\s*width: 960px;\s*height: 228px;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 769px\) and \(max-width: 1024px\)[\s\S]*?\.servicesPage \.operationSection \.teamImage\s*\{\s*width: 728px;\s*height: 173px;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 641px\) and \(max-width: 768px\)[\s\S]*?\.servicesPage \.operationSection \.teamImage\s*\{\s*width: 570px;\s*height: 135px;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 481px\) and \(max-width: 640px\)[\s\S]*?\.servicesPage \.operationSection \.teamImage,[\s\S]*?\.servicesPage \.dispatchSection \.detailBanner\s*\{\s*width: 440px;\s*height: 105px;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 361px\) and \(max-width: 480px\)[\s\S]*?\.servicesPage \.operationSection \.teamImage,[\s\S]*?\.servicesPage \.disinfectionSection \.detailBanner\s*\{\s*width: 320px;\s*height: 89px;[\s\S]*?\.servicesPage \.dispatchSection \.detailBanner\s*\{\s*width: 319px;\s*height: 89px;/s,
    );
  });

  it("matches the Figma clients-page body typography", () => {
    expect(stylesheet).toMatch(/\.clientsPage \.clientHero h1\s*\{[^}]*font-size: 3.3125rem;[^}]*line-height: 4.375rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > p\s*\{[^}]*font-size: 1.625rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading h2\s*\{[^}]*font-size: 2.6875rem;[^}]*line-height: normal;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > span\s*\{[^}]*font-size: 1.3125rem;[^}]*line-height: 1.771875rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientGroups > div > h3\s*\{[^}]*font-size: 1.0625rem;[^}]*line-height: normal;/s);
  });

  it("matches the Figma clients mobile heading geometry and tracking", () => {
    expect(stylesheet).toMatch(
      /\.clientsPage \.clientsSection\s*\{\s*padding-top: 4.01125rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.clientsPage \.clientsSection \.sectionHeading > p\s*\{[^}]*margin-bottom: 0.846875rem;[^}]*line-height: 1.1875rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.clientsPage \.clientsSection \.sectionHeading > span\s*\{[^}]*width: 18.9375rem;[^}]*letter-spacing: -0.02625rem;[^}]*line-height: 1.4375rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.clientGroups > div > h3\s*\{[^}]*padding: 0.25rem 0.75rem;[^}]*line-height: 1.0625rem;/s,
    );
  });
});
