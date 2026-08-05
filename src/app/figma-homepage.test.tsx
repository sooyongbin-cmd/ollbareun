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
    render(<MainPage />);

    expect(
      screen.getByRole("heading", { name: "인력, 시설, 위생을 따로 보지 않습니다." }),
    ).toBeInTheDocument();
    expect(screen.getByText("법정 의무소독, 살충소독(ULV·연막), 살균소독. 현재 김해공항 내 전 항공기 검역 및 방역프로세스를 독자 수행 중.")).toBeInTheDocument();
    expect(screen.getByText(/217・218호・대표이사 윤지욱・/)).toBeInTheDocument();
    expect(screen.getByText("Ⓒ2026 주식회사 올바름. All rights reserved.")).toBeInTheDocument();
    expect(screen.queryByText("연결")).not.toBeInTheDocument();
    expect(screen.queryByText("관리자")).not.toBeInTheDocument();
    expect(screen.queryByText("근무자")).not.toBeInTheDocument();
  });

  it("matches the updated about-page copy and contact labels", () => {
    render(<AboutPage />);

    expectHeadingText("사람 중심의 가치를 심고, 지속 가능한 내일을 가꿉니다.");
    expect(screen.getByText("취약계측 육성을 통한 역걍강화")).toBeInTheDocument();
    expect(screen.getByText("e-mail", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/217・218호/, { selector: "span" })).toBeInTheDocument();
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
    expect(stylesheet).toMatch(/\.aboutPage \.companySection\s*\{[^}]*padding-top: 112px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection\s*\{[^}]*padding-top: 160px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientsSection\s*\{[^}]*padding-top: 160px;/s);
    expect(stylesheet).toMatch(/\.trustSection \.sectionHeading h2\s*\{[^}]*line-height: 54px;/s);
    expect(stylesheet).toMatch(/\.trustSection \.sectionHeading > span,[\s\S]*\.homeClientSection \.sectionHeading > span\s*\{[^}]*line-height: 28\.35px;/s);
    expect(stylesheet).toMatch(/\.serviceCard p\s*\{[^}]*line-height: 21px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.clientHero h1\s*\{[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > p\s*\{[^}]*margin-bottom: 21px;/s);
    expect(stylesheet).toMatch(/\.clientsPage \.sectionHeading > span\s*\{[^}]*margin-top: 21px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.serviceHero h1\s*\{[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection \.sectionHeading > p\s*\{[^}]*margin-bottom: 21px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationSection \.sectionHeading > span\s*\{[^}]*margin-top: 21px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.operationLayout > h3\s*\{[^}]*line-height: 63px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.detailMessage\s*\{[^}]*line-height: 47px;/s);
    expect(stylesheet).toMatch(/\.servicesPage \.facilityGrid p\s*\{[^}]*line-height: 29px;/s);
    expect(stylesheet).toMatch(/\.teamImage,\s*\.detailBanner\s*\{[^}]*width: min\(100%, 1280px\);/s);
    expect(stylesheet).toMatch(/\.operationLayout\s*\{[^}]*max-width: 1280px;/s);
    expect(stylesheet).toMatch(/\.facilityGrid\s*\{[^}]*max-width: 1280px;/s);
    expect(stylesheet).toMatch(/\.clientGroups\s*\{[^}]*max-width: 1280px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.aboutHero h1\s*\{[^}]*line-height: 70px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading h2\s*\{[^}]*line-height: 54px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading > p\s*\{[^}]*margin-bottom: 14px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.companySection \.sectionHeading > span\s*\{[^}]*margin-top: 21px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.timeline p\s*\{[^}]*line-height: 28\.35px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.socialGrid p\s*\{[^}]*line-height: 29px;/s);
    expect(stylesheet).toMatch(/\.aboutPage \.contactCopy h2\s*\{[^}]*line-height: 54px;/s);
    expect(stylesheet).toMatch(/\.stats\s*\{[^}]*max-width: 1280px;/s);
    expect(stylesheet).toMatch(/\.footerGrid\s*\{[^}]*grid-template-columns: repeat\(4, 1fr\);/s);
  });
});
