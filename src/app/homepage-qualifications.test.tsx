import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomepageQualifications, { qualifications } from "./homepage-qualifications";

describe("homepage qualifications", () => {
  it("opens the selected document, navigates, closes on the image, and restores focus", () => {
    render(<HomepageQualifications />);
    const opener = screen.getByRole("button", { name: "사업자등록증 확대 보기" });
    opener.focus();
    fireEvent.click(opener);
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("img", { name: "사업자등록증" })).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "이전 자격증" }));
    expect(within(modal).getByRole("img", { name: qualifications.at(-1)!.name })).toBeInTheDocument();
    fireEvent.keyDown(modal, { key: "ArrowRight" });
    fireEvent.click(within(modal).getByRole("button", { name: "사업자등록증 이미지 닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the decorative repeat out of the accessibility tree and closes on Escape", () => {
    render(<HomepageQualifications />);
    expect(screen.getAllByRole("button")).toHaveLength(qualifications.length);
    fireEvent.click(screen.getByRole("button", { name: "여성기업확인서 확대 보기" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("여성기업확인서 확대 보기");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("limits zoom and resets it when navigating or reopening a document", () => {
    render(<HomepageQualifications />);
    const opener = screen.getByRole("button", { name: "사업자등록증 확대 보기" });
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
