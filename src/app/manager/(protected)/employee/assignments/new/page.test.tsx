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
            employees: [{ id: "emp-1", name: "홍길동" }],
            worksites: [{ id: "work-1", name: "본사" }],
          });
        }

        if (init?.method === "POST" && url.endsWith("/api/assignments")) {
          expect(JSON.parse(String(init.body))).toEqual({
            employeeId: "emp-1",
            worksiteId: "work-1",
            startDate: "2026-05-21",
            endDate: "2026-05-23",
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
    expect(screen.getByText("근무기간").closest("div")).toHaveClass("lg:min-w-[360px]");
    await user.clear(screen.getByLabelText("시작일"));
    await user.type(screen.getByLabelText("시작일"), "2026-05-21");
    await user.clear(screen.getByLabelText("종료일"));
    await user.type(screen.getByLabelText("종료일"), "2026-05-23");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.selectOptions(screen.getByLabelText("직원"), "emp-1");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료를 저장하였습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });
});
