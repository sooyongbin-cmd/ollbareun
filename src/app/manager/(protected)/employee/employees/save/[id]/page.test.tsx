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
              is_retired: false,
            },
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/employees/emp-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            name: "Alice Kim",
            phone: "010-9999-8888",
            is_retired: true,
          });
          return Response.json({
            employee: {
              id: "emp-1",
              name: "Alice Kim",
              phone: "010-9999-8888",
              is_retired: true,
            },
          });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/employees/emp-1")) {
          return new Response(null, { status: 204 });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads an employee and saves the edited data", async () => {
    const user = userEvent.setup();

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원수정" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "퇴직" })).not.toBeChecked();

    await user.clear(screen.getByLabelText("직원이름"));
    await user.type(screen.getByLabelText("직원이름"), "Alice Kim");
    await user.clear(screen.getByLabelText("연락처"));
    await user.type(screen.getByLabelText("연락처"), "010-9999-8888");
    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("수정이 완료되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("confirms and deletes the employee", async () => {
    const user = userEvent.setup();

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원수정" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("현재자료를 삭제할까요?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "예" }));

    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });
});
