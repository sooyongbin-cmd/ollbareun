import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeaveNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("leave new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/bootstrap")) {
        return Response.json({ employees: [{ id: "emp-1", name: "홍길동", is_retired: false }] });
      }
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ employeeId: "emp-1", leaveType: "1", startDate: "2026-06-01", endDate: "2026-06-03" });
      return Response.json({ leave: { id: "leave-1" } }, { status: 201 });
    }));
  });

  it("submits an employee leave application", async () => {
    const user = userEvent.setup();
    render(<LeaveNewPage />);

    await user.type(await screen.findByLabelText("이름"), "홍길동");
    await user.selectOptions(screen.getByLabelText("휴가종류"), "1");
    await user.type(screen.getByLabelText("시작일"), "2026-06-01");
    await user.type(screen.getByLabelText("종료일"), "2026-06-03");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("휴가가 신청되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/manager/leave"));
  });
});
