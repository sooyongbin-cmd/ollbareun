import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("employee save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    useParams.mockReturnValue({ id: "emp-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/employees/emp-1")) {
          return Response.json({
            employee: {
              id: "emp-1",
              name: "Alice",
              phone: "010-1234-5678",
            },
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/employees/emp-1")) {
          return Response.json({
            employee: {
              id: "emp-1",
              name: "Alice Kim",
              phone: "010-9999-8888",
            },
          });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads an employee and saves the edited data", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원수정" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("010-1234-5678")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("직원이름"));
    await user.type(screen.getByLabelText("직원이름"), "Alice Kim");
    await user.clear(screen.getByLabelText("연락처"));
    await user.type(screen.getByLabelText("연락처"), "010-9999-8888");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(alert).toHaveBeenCalledWith("수정이 완료되었습니다.");
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });
});
