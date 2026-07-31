import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPage, ClientsPage, MainPage, ServicesPage } from "./homepage-pages";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("./homepage-contact-map", () => ({
  default: () => <div data-testid="homepage-contact-map" />,
}));

describe("homepage back to top button", () => {
  it("links to the top anchor", () => {
    render(<MainPage />);

    const toTopButton = screen.getByRole("link", { name: "맨 위로 이동" });
    expect(toTopButton).toHaveAttribute("href", "#top");
  });

  it("uses the supplied homepage hero image without rendering a video", () => {
    const { container } = render(<MainPage />);

    expect(container.querySelector('img[src*="hero-main.jpg"]')).toBeInTheDocument();
    expect(container.querySelector("video")).not.toBeInTheDocument();
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
