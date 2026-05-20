import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AssignmentPage from "./manager/employee/assignments/new/page";
import EmployeeNewPage from "./manager/employee/employees/new/page";
import ManagerLayout from "./manager/layout";
import ManagerPage from "./manager/page";
import WorksiteNewPage from "./manager/employee/worksites/new/page";

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("manager pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
            employee: { id: "emp-2", name: "김철수", phone: "010-2222-3333" },
          });
        }
        if (url.endsWith("/api/worksites")) {
          return Response.json({
            worksite: { id: "work-2", name: "서울 본부" },
          });
        }
        if (url.endsWith("/api/assignments")) {
          return Response.json({
            assignment: { id: "assign-1" },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the shared manager chrome with links to the registration pages", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("heading", { name: "관리자" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "관리자화면 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "직원명부관리" })).toHaveAttribute(
      "href",
      "/manager/employee/employees",
    );
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

  it("renders the manager overview content", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("heading", { name: "관리자 화면" })).toBeInTheDocument();
    expect(screen.getByText("실시간 출근 현황")).toBeInTheDocument();
    expect(screen.queryByLabelText("직원이름")).not.toBeInTheDocument();
  });

  it("registers an employee from the admin form", async () => {
    const user = userEvent.setup();
    renderWithManagerLayout(<EmployeeNewPage />);

    expect(screen.getByRole("heading", { name: "직원등록" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("직원이름"), "김철수");
    await user.type(screen.getByLabelText("연락처"), "010-2222-3333");
    await user.click(screen.getByRole("button", { name: "직원 등록" }));

    expect(await screen.findByText("김철수 / 010-2222-3333")).toBeInTheDocument();
  });

  it("renders worksite registration as an independent manager page", () => {
    renderWithManagerLayout(<WorksiteNewPage />);

    expect(screen.getByRole("heading", { name: "근무지등록" })).toBeInTheDocument();
    expect(screen.getByLabelText("근무지명")).toBeInTheDocument();
    expect(screen.getByLabelText("위도")).toBeInTheDocument();
    expect(screen.getByLabelText("경도")).toBeInTheDocument();
  });

  it("renders worksite assignment as an independent manager page", () => {
    renderWithManagerLayout(<AssignmentPage />);

    expect(screen.getByRole("heading", { name: "근무지배정" })).toBeInTheDocument();
    expect(screen.getByLabelText("직원")).toBeInTheDocument();
    expect(screen.getByLabelText("근무지")).toBeInTheDocument();
    expect(screen.getByLabelText("근무일")).toBeInTheDocument();
  });
});
