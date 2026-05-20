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
            employees: [{ id: "emp-1", name: "근태수" }],
            worksites: [{ id: "work-1", name: "본사" }],
          });
        }

        if (init?.method === "POST" && url.endsWith("/api/assignments")) {
          return Response.json({ assignment: { id: "assign-1" } });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows an alert after saving and returns to assignment management", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<AssignmentNewPage />);

    expect(await screen.findByRole("heading", { name: "배정하기" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("직원"), "emp-1");
    await user.selectOptions(screen.getByLabelText("근무지"), "work-1");
    await user.clear(screen.getByLabelText("근무일"));
    await user.type(screen.getByLabelText("근무일"), "2026-05-21");
    await user.click(screen.getByRole("button", { name: "배정하기" }));

    expect(alert).toHaveBeenCalledWith("자료를 저장하였습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments");
  });
});
