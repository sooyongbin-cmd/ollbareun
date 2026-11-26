import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import "../../public/homepage/certificate-viewer.js";
import HomepageQualifications, { qualifications } from "./homepage-qualifications";

describe("homepage qualifications", () => {
  it("opens the selected document, navigates, closes on the image, and restores focus", () => {
    render(<HomepageQualifications />);
    const opener = screen.getByRole("link", { name: "사업자등록증 확대 보기" });
    opener.focus();
    fireEvent.click(opener);
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("img", { name: "사업자등록증" })).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "이전 자격증" }));
    expect(within(modal).getByRole("img", { name: qualifications.at(-1)!.name })).toBeInTheDocument();
    fireEvent.keyDown(modal, { key: "ArrowRight" });
    fireEvent.click(within(modal).getByRole("button", { name: "사업자등록증 이미지 닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the decorative repeat out of the accessibility tree and closes on Escape", () => {
    render(<HomepageQualifications />);
    expect(screen.getAllByRole("link")).toHaveLength(qualifications.length);
    fireEvent.click(screen.getByRole("link", { name: "여성기업확인서 확대 보기" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("여성기업확인서 확대 보기");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the repeated thumbnail from server HTML without React or native dialog support", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.innerHTML = renderToStaticMarkup(<HomepageQualifications />);
    const repeat = host.querySelector<HTMLAnchorElement>('[aria-hidden="true"] a[data-certificate="3"]')!;
    const prototype = HTMLDialogElement.prototype;
    const original = Object.getOwnPropertyDescriptor(prototype, "showModal");
    Object.defineProperty(prototype, "showModal", { value: undefined, configurable: true });
    try {
      expect(repeat.getAttribute("href")).toBe("/homepage/qualifications/gimhae-airport-customs.jpg");
      fireEvent.click(repeat);
      const modal = screen.getByRole("dialog", { name: "김해공항세관등록증 확대 보기" });
      expect(within(modal).getByRole("img", { name: "김해공항세관등록증" })).toHaveAttribute("src", repeat.href);
      expect(within(modal).getByText("4 / 11")).toBeInTheDocument();
      fireEvent.click(modal);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(repeat);
    } finally {
      if (original) Object.defineProperty(prototype, "showModal", original);
      else Reflect.deleteProperty(prototype, "showModal");
      host.remove();
    }
  });

  it("limits zoom and resets it when navigating or reopening a document", () => {
    render(<HomepageQualifications />);
    const opener = screen.getByRole("link", { name: "사업자등록증 확대 보기" });
    fireEvent.click(opener);
    const modal = screen.getByRole("dialog");
    const zoomIn = within(modal).getByRole("button", { name: "자격증 확대" });
    const zoomOut = within(modal).getByRole("button", { name: "자격증 축소" });
    const viewport = () => within(screen.getByRole("dialog")).getByRole("img", { name: "사업자등록증" }).parentElement!.parentElement!;
    fireEvent.click(zoomIn);
    expect(viewport().style.getPropertyValue("--certificate-zoom")).toBe("1.25");
    for (let index = 0; index < 12; index++) fireEvent.click(zoomIn);
    expect(zoomIn).toBeDisabled();
    expect(viewport().style.getPropertyValue("--certificate-zoom")).toBe("3");
    for (let index = 0; index < 12; index++) fireEvent.click(zoomOut);
    expect(zoomOut).toBeDisabled();
    expect(viewport().style.getPropertyValue("--certificate-zoom")).toBe("0.5");
    fireEvent.click(within(modal).getByRole("button", { name: "다음 자격증" }));
    expect(within(modal).getByRole("img", { name: "사회적기업인증서" }).parentElement!.parentElement!.style.getPropertyValue("--certificate-zoom")).toBe("1");
    fireEvent.click(zoomIn);
    fireEvent.click(within(modal).getByRole("button", { name: "자격증 모달 닫기" }));
    fireEvent.click(opener);
    expect(viewport().style.getPropertyValue("--certificate-zoom")).toBe("1");
  });
});
