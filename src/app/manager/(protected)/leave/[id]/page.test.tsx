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
        if (url.endsWith("/api/system/configs/leave_code")) {
          return Response.json({ config: { content: "월차\n연차" } });
        }
        return Response.json({ leave: { id: "leave-1", employeeId: "emp-1", employeeName: "홍길동", leaveType: "월차", startDate: "2026-06-01", endDate: "2026-06-03" } });
      }
      if (init.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ employeeId: "emp-1", leaveType: "연차", startDate: "2026-06-02", endDate: "2026-06-04" });
        return Response.json({ leave: { id: "leave-1" } });
      }
      if (init.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
  });

  it("shows the leave record without a save button and deletes it", async () => {
    const user = userEvent.setup();
    render(<LeaveDetailPage />);

    expect(await screen.findByDisplayValue("홍길동")).toBeInTheDocument();
    expect(screen.getByDisplayValue("월차")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-03")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "예" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/manager/leave"));
  });
});
