import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignmentNewPage from "./page";

const push = vi.fn();
let assignmentResponses: Response[];
let assignmentRequests: { body: Record<string, unknown> }[];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("assignment new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    assignmentResponses = [];
    assignmentRequests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "emp-1", name: "홍길동", is_retired: false, work_style: "0", in_time: "09:00", out_time: 1080, has_weekend: true },
              { id: "emp-2", name: "김철수", is_retired: false, work_style: "0", in_time: "08:00", out_time: "17:00" },
              { id: "emp-3", name: "가나다", is_retired: false, work_style: "0", in_time: "07:00", out_time: "16:00" },
              { id: "emp-4", name: "퇴직자", is_retired: true, work_style: "0", in_time: "07:00", out_time: "16:00" },
            ],
            worksites: [{ id: "work-1", name: "본사" }],
          });
        }

        if (init?.method === "POST" && url.endsWith("/api/assignments")) {
          assignmentRequests.push({ body: JSON.parse(String(init.body)) });
          return assignmentResponses.shift() ?? Response.json({ assignment: { id: "assign-1" } });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves an assignment period and opens the created assignment detail", async () => {
    const user = userEvent.setup();

    render(<AssignmentNewPage />);

    expect(await screen.findByRole("heading", { name: "배정등록" })).toBeInTheDocument();
    expect(screen.getByText("근무기간")).toBeInTheDocument();
    expect(screen.getByLabelText("근무형태")).toBeInTheDocument();
    expect(screen.getByLabelText("출근")).toHaveValue("08:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("18:00");
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");
    const primaryRow = screen.getByTestId("assignment-primary-row");
    const scheduleRow = screen.getByTestId("assignment-schedule-row");
    expect(primaryRow).toContainElement(screen.getByLabelText("근무자"));
    expect(primaryRow).toContainElement(screen.getByLabelText("근무지"));
    expect(primaryRow).toContainElement(screen.getByLabelText("시작일"));
    expect(scheduleRow).toContainElement(screen.getByLabelText("근무형태"));
    expect(scheduleRow).toContainElement(screen.getByLabelText("출근"));
    expect(scheduleRow).toContainElement(screen.getByLabelText("퇴근"));
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
    expect(screen.getByLabelText("출근")).toHaveValue("09:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("18:00");
    await user.selectOptions(screen.getByLabelText("근무형태"), "2");
    expect(screen.getByLabelText("출근")).toHaveValue("22:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("30:00");
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");
    await user.click(screen.getByRole("button", { name: "배정등록" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    expect(assignmentRequests[0].body).toEqual({
      employeeId: "emp-1",
      worksiteId: "work-1",
      startDate: "2026-05-21",
      endDate: "2026-05-23",
      work_style: "2",
      has_weekend: false,
      schedule_rules: ["saturday", "sunday", "holiday"].map(day_type => ({ day_type, is_working_day: false, in_time: null, out_time: null })),
      in_time: "22:00",
      out_time: "30:00",
    });
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments/save/assign-1");
  });

  it("sets schedule defaults when work style changes", async () => {
    const user = userEvent.setup();
    render(<AssignmentNewPage />);

    await screen.findByRole("heading", { name: "배정등록" });
    await user.selectOptions(screen.getByLabelText("근무형태"), "1");
    expect(screen.getByLabelText("출근")).toHaveValue("06:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("30:00");
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");

    await user.selectOptions(screen.getByLabelText("근무형태"), "0");
    expect(screen.getByLabelText("출근")).toHaveValue("08:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("18:00");
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");
  });

  it("shows the overlapping employee and dates in a confirmation modal and does not save when declined", async () => {
    const user = userEvent.setup();
    assignmentResponses.push(Response.json({
      error: "해당 직원의 근무기간이 기존 배정과 겹칩니다.",
      conflict: {
        id: "old-1",
        employeeId: "emp-1",
        employeeName: "홍길동",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
    }, { status: 409 }));

    render(<AssignmentNewPage />);
    await screen.findByRole("heading", { name: "배정등록" });
    await user.selectOptions(screen.getByLabelText("근무자"), "emp-1");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.click(screen.getByRole("button", { name: "배정등록" }));

    expect(await screen.findByText(
      "근무자 (홍길동) 의 기존배정 (2026-01-01~2026-12-31) 자료와 배정기간이 중복됩니다. 기존 배정기간을 조정할까요?",
    )).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "아니오" }));

    expect(screen.queryByText(/기존배정/)).not.toBeInTheDocument();
    expect(assignmentRequests).toHaveLength(1);
    expect(assignmentRequests[0].body).not.toHaveProperty("resolveOverlap");
  });

  it("sends the confirmed overlap adjustment request", async () => {
    const user = userEvent.setup();
    assignmentResponses.push(
      Response.json({
        error: "해당 직원의 근무기간이 기존 배정과 겹칩니다.",
        conflict: {
          id: "old-1",
          employeeId: "emp-1",
          employeeName: "홍길동",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
      }, { status: 409 }),
      Response.json({ assignment: { id: "assign-2" } }),
    );

    render(<AssignmentNewPage />);
    await screen.findByRole("heading", { name: "배정등록" });
    await user.selectOptions(screen.getByLabelText("근무자"), "emp-1");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.click(screen.getByRole("button", { name: "배정등록" }));
    await screen.findByText(/기존배정/);
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    expect(assignmentRequests).toHaveLength(2);
    expect(assignmentRequests[1].body).toMatchObject({
      employeeId: "emp-1",
      resolveOverlap: true,
      resolveOverlapAssignmentId: "old-1",
      resolveOverlapStartDate: "2026-01-01",
      resolveOverlapEndDate: "2026-12-31",
    });
  });

  it("shows assignment save errors in an alert modal", async () => {
    const user = userEvent.setup();
    assignmentResponses.push(Response.json({ error: "저장 오류" }, { status: 400 }));

    render(<AssignmentNewPage />);
    await screen.findByRole("heading", { name: "배정등록" });
    await user.selectOptions(screen.getByLabelText("근무자"), "emp-1");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.click(screen.getByRole("button", { name: "배정등록" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("저장 오류");
    expect(screen.getAllByText("저장 오류")).toHaveLength(1);
  });
});
