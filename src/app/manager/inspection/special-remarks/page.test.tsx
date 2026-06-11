import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpecialRemarksPage from "./page";

describe("manager special remarks page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/inspection/special-remarks" || url === "/api/inspection/special-remarks?year=2026") {
          return Response.json({
            reports: [
              {
                id: "report-1",
                reported_at: "2026-06-11T00:10:00Z",
                employee_name: "홍길동",
                content: "출입문 파손",
                photo_url: "https://example.com/photo.jpg",
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("filters by year and opens the attached photo popup", async () => {
    const user = userEvent.setup();
    render(<SpecialRemarksPage />);

    expect(await screen.findByRole("heading", { name: "특이사항" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검일시" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검자" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "특이사항내용" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "첨부사진링크" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("조회연도"), "2026");
    await user.click(screen.getByRole("button", { name: "조회" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/special-remarks?year=2026");
    });
    expect(await screen.findByText("출입문 파손")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "첨부사진" }));

    expect(screen.getByAltText("첨부사진")).toHaveAttribute("src", "https://example.com/photo.jpg");
  });
});
