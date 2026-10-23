import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { educationToday } from "@/lib/education-periods";
import SpecialRemarksPage from "./page";

afterEach(() => vi.unstubAllGlobals());
describe("manager special remarks page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ reports: [{
      id: "report-1", reported_at: "2026-06-11T00:10:00Z", employee_name: "홍길동", worksite_name: "본사",
      employee_role: "경비원", work_style: "1", processing_status: "N",
      content: "출입문 파손\n두번째 줄 내용", photo_url: "https://example.com/photo.jpg",
      photo_urls: ["https://example.com/photo.jpg", "https://example.com/photo-2.jpg"],
    }, {
      id: "report-2", reported_at: "2026-06-12T00:10:00Z", employee_name: "김철수", worksite_name: "지사",
      employee_role: "미화원", work_style: "0", processing_status: "Y", content: "처리한 내용", photo_url: null,
    }] })));
  });

  it("defaults to the Korean month and shows worksite and employee summary before the linked date", async () => {
    render(<SpecialRemarksPage />);
    expect(screen.getByLabelText("조회년월")).toHaveAttribute("type", "month");
    expect(screen.getByLabelText("조회년월")).toHaveValue(educationToday().slice(0, 7));
    await screen.findByText("홍길동 (경비,격일)");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "근무지", "이름", "점검일시", "특이사항내용", "첨부사진", "처리",
    ]);
    expect(screen.getByText("본사")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("조회년월"), { target: { value: "2026-06" } });
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith("/api/inspection/special-remarks?yearMonth=2026-06"));
    expect(await screen.findByText("출입문 파손....")).toBeInTheDocument();
    expect(screen.queryByText("두번째 줄 내용")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /2026/ })).toHaveAttribute("href", "/manager/inspection/special-remarks/report-1");
    expect(screen.getByAltText("첨부사진 썸네일")).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(screen.queryByAltText("첨부사진 2")).not.toBeInTheDocument();
  });
  it("preserves the completed filter", async () => {
    render(<SpecialRemarksPage />);
    await screen.findByText("홍길동 (경비,격일)");
    expect(screen.queryByText("김철수 (미화,일반)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("처리완료"));
    expect(screen.getByText("김철수 (미화,일반)")).toBeInTheDocument();
    expect(screen.queryByText("홍길동 (경비,격일)")).not.toBeInTheDocument();
  });
});
