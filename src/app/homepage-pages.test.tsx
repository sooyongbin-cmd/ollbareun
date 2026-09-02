import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPage, ClientsPage, MainPage, ServicesPage } from "./homepage-pages";
import { HomepageCompanyAddressProvider } from "./homepage-company-address";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("./homepage-contact-map", () => ({
  default: ({
    address,
    coordinates,
  }: {
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  }) => (
    <div
      data-testid="homepage-contact-map"
      data-address={address}
      data-latitude={coordinates?.latitude}
      data-longitude={coordinates?.longitude}
    />
  ),
}));

describe("homepage back to top button", () => {
  it("links to the top anchor and shows up on scroll", () => {
    render(<MainPage />);

    const toTopButton = screen.getByRole("link", { name: "맨 위로 이동" });
    expect(toTopButton).toHaveAttribute("href", "#top");
    expect(toTopButton.className).not.toContain("toTopVisible");

    window.scrollY = 300;
    fireEvent.scroll(window);

    expect(toTopButton.className).toContain("toTopVisible");
  });

  it("uses the supplied homepage hero image without rendering a video", () => {
    const { container } = render(<MainPage />);

    expect(container.querySelector('img[src*="hero-lighthouse-figma.png"]')).toBeInTheDocument();
    expect(container.querySelector("video")).not.toBeInTheDocument();
  });

  it("uses the supplied certificate SVGs", () => {
    const { container } = render(<MainPage />);

    for (const filename of ["lc_1.svg", "lc_2.svg", "lc_3.svg"]) {
      expect(container.querySelector(`img[src*="${filename}"]`)).toBeInTheDocument();
    }
  });

  it("uses the supplied archive navigation icon", () => {
    const { container } = render(<MainPage />);

    expect(
      container.querySelector('img[src*="archive/more.svg"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('img[src*="archive/to-top.svg"]'),
    ).toBeInTheDocument();
  });

  it("renders client preview logos without external links", () => {
    const { container } = render(<MainPage />);
    const clientLogos = container.querySelector('[class*="homeClientLogos"]');

    expect(clientLogos?.querySelectorAll("img")).toHaveLength(6);
    expect(clientLogos?.querySelectorAll("a")).toHaveLength(0);
  });

  it("matches the mobile client wrapping and footer connection structure", () => {
    const { container } = render(<MainPage />);
    const clientSection = container.querySelector('[class*="homeClientSection"]');
    const clientHeading = clientSection?.querySelector("h2");
    const clientDescription = clientSection?.querySelector('[class*="sectionHeading"] > span');
    const footerAddress = container.querySelector('[class*="footerAddress"]');

    expect(clientHeading?.querySelectorAll('[class*="mobileOnlyBreak"]')).toHaveLength(1);
    expect(clientDescription?.querySelector('[class*="mobileOnlyCopy"]')).toBeInTheDocument();
    expect(clientSection?.querySelectorAll('[class*="homeClientLogos"] > div')).toHaveLength(6);
    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute("href", "/manager");
    expect(screen.getByRole("link", { name: "근무자" })).toHaveAttribute("href", "/guard");
    expect(footerAddress?.querySelectorAll('[class*="footerAddressLine"]')).toHaveLength(2);
  });

  it("renders the three main services as separate content items", () => {
    const { container } = render(<MainPage />);
    const serviceGrid = container.querySelector('[class*="serviceGrid"]');

    expect(serviceGrid?.querySelectorAll("article")).toHaveLength(3);
  });

  it("groups service and client previews inside their shared content frames", () => {
    const { container } = render(<MainPage />);
    const serviceSection = container.querySelector('[class*="servicePreview"]');
    const clientSection = container.querySelector('[class*="homeClientSection"]');

    expect(serviceSection?.querySelector('[class*="serviceContent"] > [class*="serviceBody"]')).toBeInTheDocument();
    expect(serviceSection?.querySelector('[class*="serviceBody"] > [class*="sectionHeading"]')).toBeInTheDocument();
    expect(serviceSection?.querySelector('[class*="serviceBody"] > [class*="serviceGrid"]')).toBeInTheDocument();
    expect(serviceSection?.querySelector('[class*="serviceContent"] > a')).toHaveAttribute("href", "/services");
    expect(clientSection?.querySelector('[class*="clientContent"] > [class*="clientBody"]')).toBeInTheDocument();
    expect(clientSection?.querySelector('[class*="clientBody"] > [class*="sectionHeading"]')).toBeInTheDocument();
    expect(clientSection?.querySelector('[class*="clientBody"] > [class*="homeClientLogos"]')).toBeInTheDocument();
    expect(clientSection?.querySelector('[class*="clientContent"] > a')).toHaveAttribute("href", "/clients");
  });
});

describe("public homepage pages", () => {
  it("uses the configured company address in the contact section and map", () => {
    const companyAddress = "부산광역시 강서구 새 주소 1길 2";
    const mapCoordinates = { latitude: 35.123456, longitude: 128.901234 };

    render(
      <HomepageCompanyAddressProvider companyAddress={companyAddress} mapCoordinates={mapCoordinates}>
        <AboutPage />
      </HomepageCompanyAddressProvider>,
    );

    expect(screen.getAllByText(companyAddress)).toHaveLength(2);
    expect(screen.getByTestId("homepage-contact-map")).toHaveAttribute(
      "data-latitude",
      String(mapCoordinates.latitude),
    );
    expect(screen.getByTestId("homepage-contact-map")).toHaveAttribute(
      "data-longitude",
      String(mapCoordinates.longitude),
    );
  });

  it("renders the Figma company content", () => {
    const { container } = render(<AboutPage />);

    expect(screen.getByText("2018", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("10.3억")).toBeInTheDocument();
    expect(screen.getByText("B.E.S.T")).toBeInTheDocument();
    expect(container.querySelectorAll('[class*="timeline"] > li')).toHaveLength(5);
    expect(container.querySelectorAll('[class*="socialGrid"] > article')).toHaveLength(4);
    expect(container.querySelectorAll('[class*="contactCopy"] address > span, [class*="contactCopy"] address > a')).toHaveLength(4);
    expect(container.querySelector('[class*="socialSection"] [class*="mobileOnlyCopy"]')).toBeInTheDocument();
  });

  it("uses the supplied archive icons for every contact detail", () => {
    const { container } = render(<AboutPage />);

    for (const filename of [
      "contact-address.svg",
      "contact-phone.svg",
      "contact-fax.svg",
      "contact-email.svg",
    ]) {
      expect(container.querySelector(`img[src*="${filename}"]`)).toBeInTheDocument();
    }
  });

  it("renders four distinct operation steps", () => {
    const { container } = render(<ServicesPage />);

    expect(screen.getByText("준비단계와 목표 설정")).toBeInTheDocument();
    expect(screen.getByText("비용 분석과 계약 협상")).toBeInTheDocument();
    expect(screen.getByText("운영 모니터링과 평가")).toBeInTheDocument();
    expect(screen.getByText("이슈 대응과 현장 존중")).toBeInTheDocument();
    const operationSteps = container.querySelectorAll(
      'ol[class*="operationSteps"] > li',
    );
    expect(operationSteps).toHaveLength(4);
    expect(container.querySelector('img[src*="operation-system.svg"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="operation-step-ring.svg"]')).toBeInTheDocument();
    expect(container.querySelector('img[src*="operation-step-04.svg"]')).toBeInTheDocument();
  });

  it("keeps operation card descriptions aligned to the Figma line-break variants", () => {
    const { container } = render(<ServicesPage />);

    expect(container.querySelectorAll('[class*="operationDescriptionWide"]')).toHaveLength(4);
    expect(container.querySelectorAll('[class*="operationDescriptionNarrow"]')).toHaveLength(4);
    expect(container.querySelectorAll('[class*="operationDescriptionMobile"]')).toHaveLength(4);

    expect(container.querySelector('[class*="operationDescriptionWide"]')?.innerHTML).toContain(
      "업무 범위,<br",
    );
    expect(container.querySelectorAll('[class*="operationDescriptionMobile"]')[0].innerHTML).toContain(
      "추진 배경,<br",
    );
    expect(container.querySelectorAll('[class*="operationDescriptionMobile"]')[0].innerHTML).toContain(
      "수행기준을<br",
    );
    expect(container.querySelectorAll('[class*="operationDescriptionNarrow"]')[1].innerHTML).toContain(
      "개선목표를<br",
    );
  });

  it("uses the supplied archive icons for facility management cards", () => {
    const { container } = render(<ServicesPage />);

    for (const filename of [
      "facility-maintenance.svg",
      "facility-hygiene.svg",
      "facility-security.svg",
      "facility-parking.svg",
    ]) {
      expect(container.querySelector(`img[src*="${filename}"]`)).toBeInTheDocument();
    }

    expect(container.querySelectorAll('[class*="facilityGrid"] svg')).toHaveLength(0);
  });

  it("keeps the services mobile sections and line-break-only content in place", () => {
    const { container } = render(<ServicesPage />);

    expect(container.querySelector('#dispatch[class*="dispatchSection"]')).toBeInTheDocument();
    expect(container.querySelector('#facility[class*="facilityManagementSection"]')).toBeInTheDocument();
    expect(container.querySelector('#disinfection[class*="disinfectionSection"]')).toBeInTheDocument();
    expect(container.querySelector('#disinfection [class*="mobileOnlyBreak"]')).toBeInTheDocument();
  });

  it("renders all client categories", () => {
    const { container } = render(<ClientsPage />);

    expect(screen.getByRole("heading", { name: "공공기관" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "교육기관" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "항공사" })).toBeInTheDocument();
    expect(container.querySelector('#client-list h2 + span br')).toBeInTheDocument();
  });
});
