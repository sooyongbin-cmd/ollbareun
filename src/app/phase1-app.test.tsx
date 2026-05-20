import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardPage from "./guard/page";
import AssignmentPage from "./manager/employee/assignments/new/page";
import EmployeeNewPage from "./manager/employee/employees/new/page";
import ManagerPage from "./manager/page";
import WorksiteNewPage from "./manager/employee/worksites/new/page";
import Home from "./page";

const bootstrap = {
  employees: [],
  worksites: [],
  assignments: [],
  attendance: [],
  summary: { totalEmployees: 0, currentlyClockedIn: 0 },
};

describe("Phase1App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json(bootstrap);
        }
        if (url.endsWith("/api/employees")) {
          return Response.json({
            employee: { id: "emp-1", name: "홍길동", phone: "010-1234-5678" },
          });
        }
        if (url.endsWith("/api/guard/auth")) {
          return Response.json({
            employee: { id: "emp-1", name: "홍길동", phone: "010-1234-5678" },
            assignment: null,
            worksite: null,
            attendance: null,
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders only manager and guard navigation buttons on the initial screen", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "관리자" })).toHaveAttribute("href", "/manager");
    expect(screen.getByRole("link", { name: "경비원" })).toHaveAttribute("href", "/guard");
    expect(screen.queryByRole("heading", { name: "관리자 화면" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "경비원 화면" })).not.toBeInTheDocument();
  });

  it("renders the manager overview without registration forms or guard UI", async () => {
    render(<ManagerPage />);

    expect(await screen.findByRole("heading", { name: "관리자 화면" })).toBeInTheDocument();
    expect(screen.queryByLabelText("직원이름")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("근무지명")).not.toBeInTheDocument();
    expect(screen.queryByText("관리자 로그인")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "경비원 화면" })).not.toBeInTheDocument();
  });

  it("renders manager sidebar links to independent registration pages", async () => {
    render(<ManagerPage />);

    const menu = await screen.findByRole("navigation", { name: "관리자화면 메뉴" });
    const employeeSection = screen.getByText("직원 관리").closest("li");

    expect(menu).toHaveTextContent("대시보드");
    expect(menu).toHaveTextContent("직원 관리");
    expect(menu).toHaveTextContent("직원명부관리(목록)/등록/수정");
    expect(menu).toHaveTextContent("근태 관리");
    expect(menu).toHaveTextContent("근무지 배정 및 관리");
    expect(menu).toHaveTextContent("안전교육 관리");
    expect(menu).toHaveTextContent("권한 관리");
    expect(menu).toHaveTextContent("리포트 출력");
    expect(menu).not.toHaveTextContent("등록 메뉴");
    expect(employeeSection).toContainElement(screen.getByRole("link", { name: "직원등록" }));
    expect(employeeSection).toContainElement(screen.getByRole("link", { name: "근무지등록" }));
    expect(employeeSection).toContainElement(screen.getByRole("link", { name: "근무지배정" }));
    expect(screen.getByRole("link", { name: "직원등록" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/new",
    );
    expect(screen.getByRole("link", { name: "근무지등록" })).toHaveAttribute(
      "href",
      "/manager/employee/worksites/new",
    );
    expect(screen.getByRole("link", { name: "근무지배정" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments/new",
    );
  });

  it("renders employee registration as an independent manager page", async () => {
    render(<EmployeeNewPage />);

    expect(await screen.findByRole("heading", { name: "직원등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원이름")).toBeInTheDocument();
    expect(screen.getByLabelText("연락처")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "근무지등록" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "근무지배정" })).not.toBeInTheDocument();
  });

  it("renders worksite registration as an independent manager page", async () => {
    render(<WorksiteNewPage />);

    expect(await screen.findByRole("heading", { name: "근무지등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("근무지명")).toBeInTheDocument();
    expect(screen.getByLabelText("위도")).toBeInTheDocument();
    expect(screen.getByLabelText("경도")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "직원등록" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "근무지배정" })).not.toBeInTheDocument();
  });

  it("renders worksite assignment as an independent manager page", async () => {
    render(<AssignmentPage />);

    expect(await screen.findByRole("heading", { name: "근무지배정" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원")).toBeInTheDocument();
    expect(screen.getByLabelText("근무지")).toBeInTheDocument();
    expect(screen.getByLabelText("근무일")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "직원등록" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "근무지등록" })).not.toBeInTheDocument();
  });

  it("registers an employee from the admin form", async () => {
    const user = userEvent.setup();
    render(<EmployeeNewPage />);

    await user.type(await screen.findByLabelText("직원이름"), "홍길동");
    await user.type(screen.getByLabelText("연락처"), "010-1234-5678");
    await user.click(screen.getByRole("button", { name: "직원 등록" }));

    expect(await screen.findByText("홍길동 / 010-1234-5678")).toBeInTheDocument();
  });

  it("authenticates a guard with registered name and contact number", async () => {
    const user = userEvent.setup();
    render(<GuardPage />);

    expect(await screen.findByRole("heading", { name: "경비원 화면" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "관리자 화면" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("경비원 이름"), "홍길동");
    await user.type(screen.getByLabelText("경비원 연락처"), "010-1234-5678");
    await user.click(screen.getByRole("button", { name: "경비원 인증" }));

    expect(await screen.findByText("홍길동님 인증됨")).toBeInTheDocument();
  });
});
