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

    const workStyleSelect = screen.getByLabelText("근무형태") as HTMLSelectElement;
    expect(Array.from(workStyleSelect.options).map((opt) => opt.textContent)).toEqual(["일반근무", "격일근무", "야간근무"]);
    
    const roleSelect = screen.getByLabelText("직군") as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    expect(roleSelect.value).toBe("경비원"); // default value

    const options = Array.from(roleSelect.options).map((opt) => opt.value);
    expect(options).toEqual(["경비원", "미화원", "파견"]);
    expect(screen.getByLabelText("퇴근")).toHaveValue("30:00");
    expect(screen.getByText(/다음 날 오전 6시는 30:00/)).toBeInTheDocument();
  });

  it("submits the registration form with selected role and navigates on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/employees")) {
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          name: "홍길동",
          phone: "01012345678",
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
    await user.type(screen.getByLabelText("연락처"), "01012345678");
    expect(screen.getByLabelText("연락처")).toHaveValue("010-1234-5678");
    await user.selectOptions(screen.getByLabelText("직군"), "미화원");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("직원이름(홍길동) 연락처(010-1234-5678) 직군(미화원) 등록완료")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("submits a next-day clock-out time as its stored clock value", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ work_style: "1", in_time: "06:00", out_time: "06:00" });
      return Response.json({ employee: { id: "emp-1", name: "홍길동", phone: "010-1234-5678", role: "경비원" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EmployeeNewPage />);
    await user.type(screen.getByLabelText("직원이름"), "홍길동");
    await user.type(screen.getByLabelText("연락처"), "01012345678");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(/등록완료/)).toBeInTheDocument();
  });
});
