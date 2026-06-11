import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("employee new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
  });

  it("renders the new employee registration screen with role select dropdown", () => {
    render(<EmployeeNewPage />);

    expect(screen.getByRole("heading", { name: "직원등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원이름")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    
    const roleSelect = screen.getByLabelText("역할") as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    expect(roleSelect.value).toBe("경비원"); // default value

    const options = Array.from(roleSelect.options).map((opt) => opt.value);
    expect(options).toEqual(["경비원", "미화원", "파견"]);
  });

  it("submits the registration form with selected role and navigates on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/employees")) {
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          name: "홍길동",
          phone: "010-1234-5678",
          role: "미화원",
        });
        return Response.json({
          employee: {
            id: "emp-1",
            name: "홍길동",
            phone: "010-1234-5678",
            role: "미화원",
          },
        });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EmployeeNewPage />);

    await user.type(screen.getByLabelText("직원이름"), "홍길동");
    await user.type(screen.getByLabelText("연락처"), "010-1234-5678");
    await user.selectOptions(screen.getByLabelText("역할"), "미화원");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("직원이름(홍길동) 연락처(010-1234-5678) 역할(미화원) 등록완료")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });
});
