import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AboutPage, ClientsPage, MainPage, ServicesPage } from "./homepage-pages";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("./homepage-contact-map", () => ({
  default: () => <div data-testid="homepage-contact-map" />,
}));

const stylesheet = readFileSync("src/app/page.module.css", "utf8");

function expectHeadingText(expected: string) {
  const normalizedExpected = expected.replace(/\s+/g, "");
  const hasExactText = screen.getAllByRole("heading").some(
    (heading) => (heading.textContent ?? "").replace(/\s+/g, "") === normalizedExpected,
  );

  expect(hasExactText).toBe(true);
}

describe("Figma homepage text updates", () => {
  it("matches the updated main-page copy and footer punctuation", () => {
    const { container } = render(<MainPage />);

    expect(
      screen.getByRole("heading", { name: /인력, 시설, 위생을.*따로 보지 않습니다\./ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "법정 의무소독, 살충소독(ULV·연막), 살균소독. 현재 김해공항 내 전 항공기 검역 및 방역프로세스를 독자 수행 중.",
      ),
    ).toHaveLength(2);
    expect(screen.getByText(/217・218호/)).toBeInTheDocument();
    expect(screen.getByText("Ⓒ2026 주식회사 올바름. All rights reserved.")).toBeInTheDocument();
    expect(screen.getByText("연결", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute("href", "/manager");
    expect(screen.getByRole("link", { name: "근무자" })).toHaveAttribute("href", "/guard");
    expect(container.querySelectorAll('[class*="mobileOnlyBreak"]')).toHaveLength(1);
    expect(container.querySelector('[class*="hero"] h1')?.querySelectorAll("br")).toHaveLength(1);
  });

  it("keeps the Figma mobile service breaks and client logo order", () => {
    const { container } = render(<MainPage />);
    const serviceSection = container.querySelector('[class*="servicePreview"]');
    const clientLogos = container.querySelector('[class*="homeClientLogos"]');

    expect(serviceSection?.querySelectorAll('[class*="mobileServiceBreak"]')).toHaveLength(3);
    const serviceCards = serviceSection?.querySelectorAll('[class*="serviceCard"]') ?? [];
    expect(serviceCards[0]?.querySelector('[class*="desktopOnlyCopy"]')).toBeNull();
    expect(serviceCards[0]?.querySelector('[class*="mobileOnlyCopy"]')).toBeNull();
    expect(serviceCards[1]?.querySelector('[class*="desktopOnlyCopy"]')).toBeNull();
    expect(serviceCards[1]?.querySelector('[class*="mobileOnlyCopy"]')).toBeNull();
    expect(serviceCards[2]?.querySelector('[class*="mobileOnlyCopy"]')).not.toBeNull();
    expect(Array.from(clientLogos?.querySelectorAll("img") ?? []).map((image) => image.alt)).toEqual([
      "대한항공",
      "에어부산",
      "부산경찰청",
      "국민건강보험",
      "동아대학교",
      "경남공업고등학교",
    ]);
  });

  it("matches the updated about-page copy and contact labels", () => {
    render(<AboutPage />);

    expectHeadingText("사람 중심의 가치를 심고, 지속 가능한 내일을 가꿉니다.");
    expect(screen.getByText("취약계측 육성을 통한 역걍강화")).toBeInTheDocument();
    expect(screen.getByText("e-mail", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getAllByText(/217・218호/, { selector: "span" }).length).toBeGreaterThanOrEqual(1);
  });

  it("matches the exact services-page hero and facility-card copy", () => {
    render(<ServicesPage />);

    expectHeadingText("전문성과 체계적 관리로 최적의 환경을 완성합니다");
    expect(screen.getByText("건물/시설 유지관리")).toBeInTheDocument();
  });

  it("matches the exact clients-page hero copy", () => {
    render(<ClientsPage />);

    expectHeadingText("경험이 증명하는 실력, 책임감으로 보답합니다");
    expect(screen.getByRole("heading", { name: "고객사" })).toBeInTheDocument();
  });
});

describe("Figma homepage desktop line heights", () => {
  it("uses the updated multi-line text leading", () => {
    expect(stylesheet).toMatch(/\.aboutPage \.companySection\s*\{[^}]*padding-top: 7rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection\s*\{[^}]*padding-top: 10rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientsSection\s*\{[^}]*padding-top: 10rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientsSection \.sectionHeading\s*\{[^}]*margin-bottom: 8.125rem;/s);
    expect(stylesheet).toMatch(/\.trustSection \.sectionHeading h2\s*\{[^}]*line-height: 3.375rem;/s);
    expect(stylesheet).toMatch(/\.trustSection \.sectionHeading > span,[\s\S]*\.homeClientSection \.sectionHeading > span\s*\{[^}]*line-height: 1.771875rem;/s);
    expect(stylesheet).toMatch(/\.serviceCard p\s*\{[^}]*line-height: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.servicePreview \.sectionHeading h2\s*\{[^}]*width: 12.4375rem;[^}]*line-height: 2.0625rem;/s);
    expect(stylesheet).toMatch(/\.servicePreview \.sectionHeading > span\s*\{[^}]*width: 18.1875rem;[^}]*line-height: 1.25rem;[^}]*white-space: nowrap;/s);
    expect(stylesheet).toMatch(/\.homeClientLogos\s*\{[^}]*margin-top: 2.5rem;[^}]*padding: 0.46875rem 0 0.36875rem;[^}]*grid-template-columns: repeat\(2, 1fr\);/s);
    expect(stylesheet).toMatch(/\.homeClientLogos > div\s*\{[^}]*min-height: 6.0625rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientHero h1\s*\{[^}]*font-size: 53px;[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > p\s*\{[^}]*margin-bottom: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > span\s*\{[^}]*margin-top: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.serviceHero h1\s*\{[^}]*line-height: 4.375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection \.sectionHeading > p\s*\{[^}]*margin-bottom: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection \.sectionHeading > span\s*\{[^}]*margin-top: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout > h3\s*\{[^}]*line-height: 3.9375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.detailMessage\s*\{[^}]*line-height: 2.9375rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid p\s*\{[^}]*line-height: 1.8125rem;/s);
    expect(stylesheet).toMatch(/\.teamImage,\s*\.detailBanner\s*\{[^}]*width: min\(100%, 80rem\);/s);
    expect(stylesheet).toMatch(/\.operationLayout\s*\{[^}]*max-width: 80rem;/s);
    expect(stylesheet).toMatch(/\.facilityGrid\s*\{[^}]*max-width: 80rem;/s);
    expect(stylesheet).toMatch(/\.clientGroups\s*\{[^}]*max-width: 80rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.aboutHero h1\s*\{[^}]*line-height: 4.375rem;/s);
    expect(stylesheet).toMatch(/\.aboutHero h1\s*\{[^}]*line-height: 2.125rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading h2\s*\{[^}]*line-height: 3.375rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading > p\s*\{[^}]*margin-bottom: 0.875rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading > span\s*\{[^}]*margin-top: 1.3125rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.timeline p\s*\{[^}]*line-height: 1.771875rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.socialGrid p\s*\{[^}]*line-height: 1.8125rem;/s);
    expect(stylesheet).toMatch(/\.contactSection \.contactCopy h2\s*\{[^}]*line-height: 3.375rem;/s);
    expect(stylesheet).toMatch(/\.stats\s*\{[^}]*max-width: 80rem;/s);
    expect(stylesheet).toMatch(/\.footerGrid\s*\{[^}]*grid-template-columns: repeat\(5, 1fr\);/s);
    expect(stylesheet).toMatch(/\.mobileOnlyBreak\s*\{[^}]*display: none;/s);
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\.mobileOnlyBreak\s*\{[^}]*display: block;/s,
    );
  });
});

describe("Figma homepage mobile responsive layout", () => {
  it("uses the six discrete services hero states down to the 480px design", () => {
    const servicesHeroRules = stylesheet.split(
      "/* Services page section 1: six discrete Figma viewport states (914:2107–3210). */",
    )[1];

    expect(servicesHeroRules).toBeDefined();
    expect(servicesHeroRules).not.toMatch(/\b(?:clamp|calc)\(/);
    expect(servicesHeroRules).toMatch(
      /\.servicesPage \.serviceHero\s*\{[^}]*min-height: 502px;[^}]*height: 502px;/s,
    );
    expect(servicesHeroRules).toMatch(
      /\.servicesPage \.serviceHero h1\s*\{[^}]*font-size: 53px;[^}]*line-height: 70px;/s,
    );
    expect(servicesHeroRules).toMatch(
      /@media \(min-width: 641px\) and \(max-width: 768px\)[\s\S]*?min-height: 376px;[\s\S]*?font-size: 45px;/,
    );
    expect(servicesHeroRules).toMatch(
      /@media \(min-width: 481px\) and \(max-width: 640px\)[\s\S]*?min-height: 314px;[\s\S]*?font-size: 38px;/,
    );
    expect(servicesHeroRules).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?min-height: 280px;[\s\S]*?font-size: 30px;/,
    );
    expect(stylesheet).not.toMatch(
      /@media \(max-width: 47\.9375rem\)[\s\S]*?\.aboutHero h1,\s*\.serviceHero h1,\s*\.clientHero h1/,
    );
  });

  it("keeps the shared secondary heroes discrete without viewport calculations", () => {
    expect(stylesheet).not.toMatch(
      /\.aboutHero,\s*\.clientHero\s*\{/s,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 641px\) and \(max-width: 768px\)[\s\S]*?\.aboutHero\s*\{[^}]*min-height: 407px;[^}]*height: 407px;/,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 481px\) and \(max-width: 640px\)[\s\S]*?\.aboutHero\s*\{[^}]*min-height: 361px;[^}]*height: 361px;/,
    );
    expect(stylesheet).toMatch(
      /@media \(min-width: 361px\) and \(max-width: 480px\)[\s\S]*?\.aboutHero\s*\{[^}]*min-height: 308px;[^}]*height: 308px;/,
    );
  });

  it("uses the six discrete clients hero states including 45px at 768px", () => {
    const clientsHeroRules = stylesheet.split(
      "/* Clients page section 1: six discrete Figma viewport states (853:882–855:8568). */",
    )[1];

    expect(clientsHeroRules).toBeDefined();
    expect(clientsHeroRules).not.toMatch(/\b(?:clamp|calc)\(/);
    expect(clientsHeroRules).toMatch(/font-size: 53px;/);
    expect(clientsHeroRules).toMatch(
      /@media \(min-width: 641px\) and \(max-width: 768px\)[\s\S]*?min-height: 376px;[\s\S]*?font-size: 45px;/,
    );
    expect(clientsHeroRules).toMatch(
      /@media \(min-width: 481px\) and \(max-width: 640px\)[\s\S]*?min-height: 314px;[\s\S]*?font-size: 38px;/,
    );
    expect(clientsHeroRules).toMatch(
      /@media \(min-width: 361px\) and \(max-width: 480px\)[\s\S]*?min-height: 280px;[\s\S]*?font-size: 30px;/,
    );
    expect(clientsHeroRules).toMatch(
      /@media \(max-width: 360px\)[\s\S]*?min-height: 242px;[\s\S]*?font-size: 22.47px;/,
    );
  });

  it("uses the shared 48rem breakpoint and mobile service/client layouts", () => {
    expect(stylesheet).toContain("@media (min-width: 48rem)");
    expect(stylesheet).toContain("@media (max-width: 47.9375rem)");
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\.serviceCard\s*\{[^}]*box-shadow: none;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\.homeClientLogos\s*\{[^}]*grid-template-columns: repeat\(2, 1fr\);/s,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\.logoGrid\s*\{[^}]*grid-template-columns: repeat\(2, 1fr\);/s,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\n  \.certification\s*\{[^}]*position: absolute;/s,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 47.9375rem\)[\s\S]*\.trustSection\s*\{[^}]*padding-bottom: 4.00625rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.splitIntro\s*\{[^}]*gap: 2.625rem;/s,
    );
    expect(stylesheet).toMatch(
      /\.trustSection \.sectionHeading > span\s*\{[^}]*margin-top: 0.875rem;[^}]*line-height: 1.25rem;/s,
    );
    expect(stylesheet).toMatch(/\.certificateImages\s*\{[^}]*gap: 0.875rem;/s);
    expect(stylesheet).toMatch(/\.certificateImages > div\s*\{[^}]*height: 8.5rem;/s);
    expect(stylesheet).toMatch(/\.trustSection > \.moreLink\s*\{[^}]*margin-top: 2.75rem;/s);
    expect(stylesheet).toMatch(/\.homeClientSection \.sectionHeading h2\s*\{[^}]*max-width: 14.875rem;[^}]*line-height: 2.0625rem;/s);
    expect(stylesheet).toMatch(/\.homeClientSection \.sectionHeading > span\s*\{[^}]*width: 16.875rem;[^}]*line-height: 1.25rem;/s);
    expect(stylesheet).toMatch(/\.moreLink\s*\{[^}]*font-size: 0.641875rem;[^}]*font-weight: 700;/s);
    expect(stylesheet).toMatch(/\.moreViewIcon,[\s\S]*\.moreViewIcon img\s*\{[^}]*width: 1.18125rem;[^}]*height: 1.18125rem;/s);
    expect(stylesheet).toMatch(/\.footerGrid\s*\{[^}]*width: 14.025rem;[^}]*grid-template-columns: 7.5625rem 3.625rem;[^}]*gap: 1.6875rem 2.8375rem;/s);
    expect(stylesheet).toMatch(/\.footerBottom\s*\{[^}]*width: 20rem;[^}]*padding-top: 0.5625rem;/s);
    expect(stylesheet).toMatch(/@media \(max-width: 47.9375rem\)[\s\S]*\.aboutHero,\s*\.serviceHero,\s*\.clientHero\s*\{[^}]*min-height: 21.75rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection\s*\{[^}]*padding-top: 4.01125rem;[^}]*padding-bottom: 3.82375rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading > span\s*\{[^}]*width: 15.0625rem;[^}]*line-height: 1.4375rem;/s);
    expect(stylesheet).toMatch(/\.stats > div:nth-child\(1\) > img\s*\{[^}]*width: 1.238125rem;[^}]*height: 1.39875rem;/s);
    expect(stylesheet).toMatch(/\.timeline li\s*\{[^}]*height: 3.48125rem;[^}]*min-height: 3.48125rem;/s);
    expect(stylesheet).toMatch(/\.timeline\s*\{[^}]*width: 28.5rem;[^}]*margin: 0 auto;/s);
    expect(stylesheet).toMatch(/@media \(max-width: 48rem\)[\s\S]*\.timeline\s*\{[^}]*width: 20.25rem;/s);
    expect(stylesheet).toMatch(/\.timeline::before\s*\{[^}]*left: 50%;[^}]*transform: translateX\(-50%\);/s);
    expect(stylesheet).toMatch(/\.aboutPage \.benefitDescription\s*\{[^}]*letter-spacing: -0\.0625rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.values \.sectionHeading > span\s*\{[^}]*width: 16.5625rem;[^}]*line-height: 1.4375rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.socialSection\s*\.sectionHeading > span\s*\{[^}]*width: 19.6875rem;[^}]*line-height: 1.4375rem;/s);
    expect(stylesheet).toMatch(/\.socialGrid article\s*\{[^}]*display: block;[^}]*min-height: 11.875rem;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.contactSection \.contactCopy address > span,[\s\S]*grid-template-columns: 0.9375rem 4.875rem minmax\(0, 1fr\);/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection \.sectionHeading > span\s*\{[^}]*letter-spacing: -0\.0625rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.teamImage img\s*\{[^}]*object-position: 61\.43% center;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout\s*\{[^}]*gap: 1.725rem;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.dispatchSection \.detailBanner img\s*\{[^}]*object-fit: fill;[^}]*transform: translateX\(4.091875rem\) scale\(2\.6\);[^}]*transform-origin: center;/s);
  });

  it("uses the eight discrete landing reference states", () => {
    expect(stylesheet).toContain("--landing-content-width: 1182px");
    expect(stylesheet).toContain("--landing-hero-height: 833px");
    expect(stylesheet).toContain("--landing-trust-height: 855.161px");
    expect(stylesheet).toContain("--landing-service-height: 1073px");
    expect(stylesheet).toContain("--landing-client-height: 1197px");
    expect(stylesheet).toContain("@media (min-width: 1025px) and (max-width: 1062px)");
    expect(stylesheet).toContain("@media (min-width: 769px) and (max-width: 1024px)");
    expect(stylesheet).toContain("@media (min-width: 641px) and (max-width: 768px)");
    expect(stylesheet).toContain("@media (min-width: 481px) and (max-width: 640px)");
    expect(stylesheet).toContain("@media (min-width: 361px) and (max-width: 480px)");
    expect(stylesheet).toMatch(/\.landingPage \.homeClientLogos\s*\{[^}]*grid-auto-flow: column;/s);
  });

  it("uses one shared content frame for each landing preview section", () => {
    expect(stylesheet).toMatch(
      /\.landingPage \.serviceContent,\s*\.landingPage \.clientContent\s*\{[^}]*width: var\(--landing-content-width\);/s,
    );
    expect(stylesheet).toMatch(/\.landingPage \.splitIntro\s*\{[^}]*width: var\(--landing-content-width\);/s);
    expect(stylesheet).toMatch(/\.landingPage \.serviceBody,\s*\.landingPage \.clientBody\s*\{[^}]*width: 100%;/s);
    expect(stylesheet).toMatch(/\.landingPage \.serviceBody > \.sectionHeading\s*\{[^}]*align-self: flex-start;/s);
    expect(stylesheet).toMatch(/\.landingPage \.clientBody > \.sectionHeading\s*\{/s);
    expect(stylesheet).toMatch(/@media \(min-width: 641px\) and \(max-width: 768px\)\s*\{[^}]*\.landingPage \.homeClientLogos\s*\{[^}]*align-self: center;[^}]*max-width: none;/s);
    expect(stylesheet).toMatch(/\.landingPage \.clientContent > \.moreLink\s*\{[^}]*font-weight: 400;/s);
  });
});
