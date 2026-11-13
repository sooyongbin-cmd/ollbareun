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
});
