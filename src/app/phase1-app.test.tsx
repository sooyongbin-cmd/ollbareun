import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeNewPage from "./manager/employee/employees/new/page";
import ManagerLayout from "./manager/layout";
import ManagerPage from "./manager/page";
import WorksiteNewPage from "./manager/employee/worksites/new/page";
import AssignmentManagementPage from "./manager/employee/assignments/page";
import { Phase1App } from "./phase1-app";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("guard page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [],
            worksites: [],
            assignments: [],
            attendance: [],
            summary: { totalEmployees: 0, currentlyClockedIn: 0 },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders guard chrome and footer text without mojibake", () => {
    render(<Phase1App mode="guard" />);

    expect(screen.getAllByText("올바른 관리시스템").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "나가기" })).toHaveAttribute("href", "/");
    expect(screen.getByText("법적 고지")).toBeInTheDocument();
    expect(screen.getByText(/개인정보처리방침/)).toBeInTheDocument();
    expect(screen.queryByText(/\?щ컮|愿|踰뺤쟻|짤 2026/)).not.toBeInTheDocument();
  });

  it("shows an alert and keeps the guard logged out when the employee is retired", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({
          employees: [],
          worksites: [],
          assignments: [],
          attendance: [],
          summary: { totalEmployees: 0, currentlyClockedIn: 0 },
        });
      }
      if (init?.method === "POST" && url.endsWith("/api/guard/auth")) {
        return Response.json(
          { error: "해당직원은 퇴직처리되었습니다." },
          { status: 401 },
        );
      }
      return Response.json({}, { status: 404 });
    });

    render(<Phase1App mode="guard" />);

    await user.type(screen.getByLabelText("경비원 이름"), "홍길동");
    await user.type(screen.getByLabelText("경비원 연락처"), "010-1234-5678");
    await user.click(screen.getByRole("button", { name: "경비원 인증" }));

    expect(alert).toHaveBeenCalledWith("해당직원은 퇴직처리되었습니다.");
    expect(screen.queryByText("홍길동님 인증됨")).not.toBeInTheDocument();
  });

  it("shows the guard action buttons only after login succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({
          employees: [],
          worksites: [],
          assignments: [],
          attendance: [],
          summary: { totalEmployees: 0, currentlyClockedIn: 0 },
        });
      }
      if (init?.method === "POST" && url.endsWith("/api/guard/auth")) {
        return Response.json({
          employee: {
            id: "emp-1",
            name: "홍길동",
            phone: "010-1234-5678",
            phone_normalized: "01012345678",
            is_retired: false,
          },
          assignment: null,
          worksite: null,
          attendance: null,
        });
      }
      return Response.json({}, { status: 404 });
    });

    render(<Phase1App mode="guard" />);

    for (const name of ["출근", "퇴근", "안전교육", "근무지체크", "개인프로필"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }

    await user.type(screen.getByLabelText("경비원 이름"), "홍길동");
    await user.type(screen.getByLabelText("경비원 연락처"), "010-1234-5678");
    await user.click(screen.getByRole("button", { name: "경비원 인증" }));

    for (const name of ["출근", "퇴근", "안전교육", "근무지체크", "개인프로필"]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
  });
});

describe("manager pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            employees: [
              {
                id: "emp-1",
                name: "홍길동",
                phone: "010-1234-5678",
                phone_normalized: "01012345678",
                is_retired: false,
              },
            ],
            worksites: [
              {
                id: "work-1",
                name: "본사",
                latitude: 37.5,
                longitude: 127.0,
                radius_meters: 100,
              },
            ],
            assignments: [],
            attendance: [],
            summary: { totalEmployees: 1, currentlyClockedIn: 0 },
          });
        }
        if (url.endsWith("/api/employees")) {
          return Response.json({
            employee: {
              id: "emp-2",
              name: "김철수",
              phone: "010-2222-3333",
              is_retired: false,
            },
          });
        }
        if (url.endsWith("/api/worksites")) {
          return Response.json({
            worksite: { id: "work-2", name: "서울 본부" },
          });
        }
        if (!init && url.endsWith("/api/assignments")) {
          return Response.json({
            assignments: [
              {
                id: "assign-1",
                work_date: "2026-05-21",
                employee_name: "근태수",
                worksite_name: "본사",
              },
            ],
          });
        }
        if (init?.method === "POST" && url.endsWith("/api/assignments")) {
          return Response.json({
            assignment: { id: "assign-1" },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the shared manager chrome with links to the remaining registration pages", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("heading", { name: "관리자" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "관리자화면 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "직원명부관리" })).toHaveAttribute(
      "href",
      "/manager/employee/employees",
    );
    expect(screen.queryByRole("link", { name: "직원등록" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "근무지관리" })).toHaveAttribute(
      "href",
      "/manager/employee/worksites",
    );
    expect(screen.getByRole("link", { name: "근무지배정" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments",
    );
  });

  it("renders the manager overview content", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("heading", { name: "관리자 화면" })).toBeInTheDocument();
    expect(screen.getByText("실시간 출근 현황")).toBeInTheDocument();
    expect(screen.queryByLabelText("직원이름")).not.toBeInTheDocument();
  });

  it("registers an employee from the admin form", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    renderWithManagerLayout(<EmployeeNewPage />);

    expect(screen.getByRole("heading", { name: "직원등록" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("직원이름"), "김철수");
    await user.type(screen.getByLabelText("연락처"), "010-2222-3333");
    await user.click(screen.getByRole("button", { name: "직원 등록" }));

    expect(alert).toHaveBeenCalledWith("직원이름(김철수) 연락처(010-2222-3333) 등록완료");
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("renders worksite registration as an independent manager page", () => {
    renderWithManagerLayout(<WorksiteNewPage />);

    expect(screen.getByRole("heading", { name: "근무지등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("근무지명")).toBeInTheDocument();
    expect(screen.getByLabelText("위도")).toBeInTheDocument();
    expect(screen.getByLabelText("경도")).toBeInTheDocument();
  });

  it("renders worksite assignment management as an independent manager page", () => {
    renderWithManagerLayout(<AssignmentManagementPage />);

    expect(screen.getByRole("heading", { name: "근무지배정" })).toBeInTheDocument();
    expect(screen.getByLabelText("날짜")).toBeInTheDocument();
    expect(screen.getByLabelText("근무지")).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toBeInTheDocument();
  });
});
