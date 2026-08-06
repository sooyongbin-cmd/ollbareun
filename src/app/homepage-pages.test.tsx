import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPage, ClientsPage, MainPage, ServicesPage } from "./homepage-pages";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("./homepage-contact-map", () => ({
  default: () => <div data-testid="homepage-contact-map" />,
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

    expect(container.querySelector('img[src*="hero-main.jpg"]')).toBeInTheDocument();
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
});

describe("public homepage pages", () => {
  it("renders the Figma company content", () => {
    render(<AboutPage />);

    expect(screen.getByText("2018", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("10.3억")).toBeInTheDocument();
    expect(screen.getByText("B.E.S.T")).toBeInTheDocument();
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
    const operationDiagram = container.querySelector(
      'img[src*="operation-system.svg"]',
    );
    expect(operationDiagram).toBeInTheDocument();
    expect(operationDiagram).toHaveAttribute("width", "665");
    expect(operationDiagram).toHaveAttribute("height", "492");
    expect(container.querySelector('ol[class*="visuallyHidden"]')).toBeInTheDocument();
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

  it("renders all client categories", () => {
    render(<ClientsPage />);

    expect(screen.getByRole("heading", { name: "공공기관" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "교육기관" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "항공사" })).toBeInTheDocument();
  });
});
