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
              work_date: "2026-05-21",
            },
          });
        }

        if (!init && url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              { id: "emp-1", name: "근태수" },
              { id: "emp-2", name: "홍길동" },
            ],
            worksites: [
              { id: "work-1", name: "본사" },
              { id: "work-2", name: "서울지점" },
            ],
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/assignments/assign-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            employeeId: "emp-2",
            worksiteId: "work-2",
            workDate: "2026-05-22",
          });
          return Response.json({
            assignment: {
              id: "assign-1",
              employee_id: "emp-2",
              worksite_id: "work-2",
              work_date: "2026-05-22",
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

  it("saves assignment changes and returns to management", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "배정수정" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("2026-05-21")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("직원"), "emp-2");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-2");
    await user.clear(screen.getByLabelText("근무일"));
    await user.type(screen.getByLabelText("근무일"), "2026-05-22");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(alert).toHaveBeenCalledWith("자료가 저장되었습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });

  it("confirms and deletes the assignment", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<AssignmentSavePage />);

    expect(await screen.findByRole("heading", { name: "배정수정" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("자료를 삭제하시겠습니까?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(alert).toHaveBeenCalledWith("자료가 삭제되었습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });
});
