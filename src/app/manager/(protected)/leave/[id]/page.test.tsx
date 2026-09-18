import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeaveDetailPage from "./page";

const push = vi.fn();
const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("leave detail page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    useParams.mockReturnValue({ id: "leave-1" });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!init) {
        return Response.json({ leave: { id: "leave-1", employeeId: "emp-1", employeeName: "홍길동", leaveType: "1", startDate: "2026-06-01", endDate: "2026-06-03" } });
      }
      if (init.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ employeeId: "emp-1", leaveType: "2", startDate: "2026-06-02", endDate: "2026-06-04" });
        return Response.json({ leave: { id: "leave-1" } });
      }
      if (init.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
  });

  it("edits and deletes a leave record", async () => {
    const user = userEvent.setup();
    render(<LeaveDetailPage />);

    expect(await screen.findByDisplayValue("홍길동")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("휴가종류"), "2");
    await user.clear(screen.getByLabelText("시작일"));
    await user.type(screen.getByLabelText("시작일"), "2026-06-02");
    await user.clear(screen.getByLabelText("종료일"));
    await user.type(screen.getByLabelText("종료일"), "2026-06-04");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("휴가가 저장되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "예" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/manager/leave"));
  });
});
