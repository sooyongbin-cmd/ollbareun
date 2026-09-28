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
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/employee-roles")) {
        return Response.json({ roles: ["경비원", "미화원", "주차원", "사감"] });
      }
      return Response.json({}, { status: 404 });
    }));
  });

  it("renders the configured employee roles in the role dropdown", async () => {
    render(<EmployeeNewPage />);

    expect(screen.getByRole("heading", { name: "직원등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원이름")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();

    const workStyleSelect = screen.getByLabelText("근무형태") as HTMLSelectElement;
    expect(Array.from(workStyleSelect.options).map((opt) => opt.textContent)).toEqual(["일반근무", "격일근무", "야간근무"]);
    
    const roleSelect = screen.getByLabelText("직군") as HTMLSelectElement;
    expect(roleSelect).toBeInTheDocument();
    await screen.findByRole("option", { name: "사감" });
    expect(roleSelect.value).toBe("경비원");

    const options = Array.from(roleSelect.options).map((opt) => opt.value);
    expect(options).toEqual(["경비원", "미화원", "주차원", "사감"]);
    expect(workStyleSelect.value).toBe("0");
    expect(screen.getByLabelText("출근")).toHaveValue("08:00");
    expect(screen.getByLabelText("퇴근")).toHaveValue("18:00");
    expect(screen.getByLabelText("토요일 적용 방식")).toHaveValue("off");
  });

  it("submits the registration form with selected role and navigates on success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/employee-roles")) {
        return Response.json({ roles: ["경비원", "미화원", "주차원", "사감"] });
      }
      if (url.endsWith("/api/employees")) {
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          name: "홍길동",
          phone: "01012345678",
          role: "사감",
          has_weekend: false,
        });
        return Response.json({
          employee: {
            id: "emp-1",
            name: "홍길동",
            phone: "010-1234-5678",
            role: "사감",
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
    await screen.findByRole("option", { name: "사감" });
    await user.selectOptions(screen.getByLabelText("직군"), "사감");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("직원이름(홍길동) 연락처(010-1234-5678) 직군(사감) 등록완료")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("submits a next-day clock-out time as its stored clock value", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init) return Response.json({ roles: ["경비원", "미화원", "주차원", "사감"] });
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ work_style: "0", in_time: "08:00", out_time: "18:00", has_weekend: false });
      return Response.json({ employee: { id: "emp-1", name: "홍길동", phone: "010-1234-5678", role: "경비원" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EmployeeNewPage />);
    await screen.findByRole("option", { name: "사감" });
    await user.type(screen.getByLabelText("직원이름"), "홍길동");
    await user.type(screen.getByLabelText("연락처"), "01012345678");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText(/등록완료/)).toBeInTheDocument();
  });
});
