import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignmentSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("assignment save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
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
            employeeId: "emp-2",
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
    expect(await screen.findByDisplayValue("2026-05-21")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("2026-05-23")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("직원"), "emp-2");
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
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("자료가 삭제되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });

  it("shows the assignment calendar and immediately toggles days off", async () => {
    const user = userEvent.setup();

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "휴무일 지정" })).toBeInTheDocument();
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
