import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignmentSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();
let failNormalDelete = false;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("assignment save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    failNormalDelete = false;
    useParams.mockReturnValue({ id: "assign-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/assignments/assign-1")) {
          return Response.json({
            assignment: {
              id: "assign-1",
              employee_id: "emp-1",
              worksite_id: "work-1",
              start_date: "2026-05-21",
              end_date: "2026-05-23",
            },
          });
        }

        if (!init && url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "emp-1", name: "홍길동" },
              { id: "emp-2", name: "김철수" },
            ],
            worksites: [
              { id: "work-1", name: "본사" },
              { id: "work-2", name: "서울지점" },
            ],
          });
        }

        if (!init && url.endsWith("/api/manager/assignments/assign-1/days-off")) {
          return Response.json({
            daysOff: [{ day_off_date: "2026-05-22" }],
          });
        }

        if (!init && url.endsWith("/api/manager/assignments/assign-1/daily-attendance")) {
          return Response.json({
            dailyAttendance: [
              { work_date: "2026-05-21", intime: "2026-05-20T21:00:00.000Z", outtime: null },
              { work_date: "2026-05-22", intime: null, outtime: "2026-05-22T21:00:00.000Z" },
              { work_date: "2026-05-23", intime: "2026-05-22T21:00:00.000Z", outtime: null },
            ],
          });
        }

        if (init?.method === "PUT" && url.endsWith("/api/manager/assignments/assign-1/days-off/2026-05-23")) {
          return Response.json({
            dayOff: { day_off_date: "2026-05-23" },
          });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/manager/assignments/assign-1/days-off/2026-05-22")) {
          return new Response(null, { status: 204 });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/assignments/assign-1")) {
          expect(JSON.parse(String(init.body))).toEqual({
            employeeId: "emp-1",
            worksiteId: "work-2",
            startDate: "2026-05-22",
            endDate: "2026-05-24",
          });
          return Response.json({
            assignment: {
              id: "assign-1",
              employee_id: "emp-2",
              worksite_id: "work-2",
              start_date: "2026-05-22",
              end_date: "2026-05-24",
            },
          });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/assignments/assign-1")) {
          if (failNormalDelete) {
            return Response.json({ error: "해당 기간에 출퇴근 자료가 있어서 삭제할 수 없습니다." }, { status: 400 });
          }
          return new Response(null, { status: 204 });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/assignments/assign-1?includeAttendance=true")) {
          return new Response(null, { status: 204 });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/assignments/assign-1?afterToday=true")) {
          return new Response(null, { status: 204 });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves assignment period changes and returns to management", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지배정 상세" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("직원")).toHaveValue("홍길동");
    expect(await screen.findByDisplayValue("2026-05-21")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("2026-05-23")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("근무지"), "work-2");
    await user.clear(screen.getByLabelText("시작일"));
    await user.type(screen.getByLabelText("시작일"), "2026-05-22");
    await user.clear(screen.getByLabelText("종료일"));
    await user.type(screen.getByLabelText("종료일"), "2026-05-24");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료가 저장되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });

  it("confirms and deletes the assignment", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지배정 상세" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("자료를 삭제하시겠습니까?")).toBeInTheDocument();
    expect(Array.from(screen.getByRole("alertdialog").querySelectorAll("button")).map((button) => button.textContent?.trim())).toEqual([
      "예",
      "아니오",
    ]);
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("자료가 삭제되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });

  it("confirms and deletes the assignment after today", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지배정 상세" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "오늘이후 근무예정 자료삭제" }));
    expect(screen.getByText("오늘 이후 자료를 포함하여 배정을 삭제할까요?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("오늘 이후 자료가 삭제되었습니다.")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/assignments/assign-1?afterToday=true",
      { method: "DELETE" },
    );
  });

  it("confirms and deletes the assignment with all attendance records", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지배정 상세" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체자료삭제" }));
    expect(screen.getByText("현재 발생한 근태자료를 포함하여 모두 삭제할까요?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("자료가 삭제되었습니다.")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/assignments/assign-1?includeAttendance=true",
      { method: "DELETE" },
    );
  });

  it("shows a modal when normal deletion is blocked by attendance records", async () => {
    const user = userEvent.setup();
    failNormalDelete = true;

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지배정 상세" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("해당 기간에 출퇴근 자료가 있어서 삭제할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("삭제 오류")).toBeInTheDocument();
  });

  it("shows the assignment calendar and immediately toggles days off", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "휴무일 지정" })).toBeInTheDocument();
    expect(screen.queryByText("날짜별 출퇴근 예정시각은 한국 시간 기준입니다.")).not.toBeInTheDocument();
    expect(screen.getByText("근무기간 안의 날짜를 선택하면 즉시 휴무일로 저장됩니다.")).toBeInTheDocument();
    expect(screen.getByText("일")).toBeInTheDocument();
    expect(screen.getByText("토")).toBeInTheDocument();

    const existingDayOff = screen.getByRole("button", { name: "2026-05-22 휴무일 해제" });
    expect(existingDayOff).toHaveAttribute("aria-pressed", "true");
    await user.click(existingDayOff);
    expect(existingDayOff).toHaveAttribute("aria-pressed", "false");

    const newDayOff = screen.getByRole("button", { name: "2026-05-23 휴무일 지정" });
    await user.click(newDayOff);
    expect(screen.getByRole("button", { name: "2026-05-23 휴무일 해제" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
