import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignmentNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("assignment new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "emp-1", name: "홍길동", is_retired: false, work_style: "0", in_time: "09:00", out_time: "18:00" },
              { id: "emp-2", name: "김철수", is_retired: false, work_style: "0", in_time: "08:00", out_time: "17:00" },
              { id: "emp-3", name: "가나다", is_retired: false, work_style: "0", in_time: "07:00", out_time: "16:00" },
              { id: "emp-4", name: "퇴직자", is_retired: true, work_style: "0", in_time: "07:00", out_time: "16:00" },
            ],
            worksites: [{ id: "work-1", name: "본사" }],
          });
        }

        if (init?.method === "POST" && url.endsWith("/api/assignments")) {
          expect(JSON.parse(String(init.body))).toEqual({
            employeeId: "emp-1",
            worksiteId: "work-1",
            startDate: "2026-05-21",
            endDate: "2026-05-23",
            in_time: "09:00",
            out_time: "18:00",
          });
          return Response.json({ assignment: { id: "assign-1" } });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves an assignment period and returns to assignment management", async () => {
    const user = userEvent.setup();

    render(<AssignmentNewPage />);

    expect(await screen.findByRole("heading", { name: "배정등록" })).toBeInTheDocument();
    expect(screen.getByText("근무기간")).toBeInTheDocument();
    expect(screen.getByText("근무기간").closest("div")).toHaveClass("lg:min-w-[22.5rem]");
    expect([...screen.getByLabelText("근무자").querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "선택",
      "가나다",
      "김철수",
      "홍길동",
    ]);
    expect(screen.queryByText("퇴직자")).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("시작일"));
    await user.type(screen.getByLabelText("시작일"), "2026-05-21");
    await user.clear(screen.getByLabelText("종료일"));
    await user.type(screen.getByLabelText("종료일"), "2026-05-23");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.selectOptions(screen.getByLabelText("근무자"), "emp-1");
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.queryByLabelText("출근")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("퇴근")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });
});
