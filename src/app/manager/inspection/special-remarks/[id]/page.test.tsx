import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpecialRemarkDetailPage from "./page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("manager special remark detail page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/inspection/special-remarks/report-1" && init?.method === "DELETE") {
          return Response.json({ success: true });
        }
        if (url === "/api/inspection/special-remarks/report-1") {
          return Response.json({
            report: {
              id: "report-1",
              reported_at: "2026-06-11T00:10:00Z",
              employee_name: "홍길동",
              content: "첫 줄\n두번째 줄 전체 내용",
              photo_url: "https://example.com/photo.jpg",
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows full detail and deletes the report after confirmation", async () => {
    const user = userEvent.setup();

    render(<SpecialRemarkDetailPage params={Promise.resolve({ id: "report-1" })} />);

    expect(await screen.findByRole("heading", { name: "특이사항 상세" })).toBeInTheDocument();
    expect(screen.getByText("점검일시")).toBeInTheDocument();
    expect(screen.getByText("점검자")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText(/두번째 줄 전체 내용/)).toBeInTheDocument();
    expect(screen.getByAltText("첨부사진")).toHaveAttribute("src", "https://example.com/photo.jpg");

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith("특이사항 보고를 삭제하시겠습니까?");
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/inspection/special-remarks/report-1", { method: "DELETE" });
    });
    expect(push).toHaveBeenCalledWith("/manager/inspection/special-remarks");
  });
});
