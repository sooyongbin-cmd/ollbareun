import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import EmployeeRosterPage from "./page";

const bootstrap = {
  employees: [
    {
      id: "emp-1",
      name: "Alice",
      phone: "010-1234-5678",
      phone_normalized: "01012345678",
      is_retired: false,
    },
    {
      id: "emp-2",
      name: "Bob",
      phone: "010-9999-8888",
      phone_normalized: "01099998888",
      is_retired: true,
    },
  ],
  worksites: [
    {
      id: "work-1",
      name: "본사",
    },
  ],
  assignments: [
    {
      employee_id: "emp-1",
      worksite_id: "work-1",
    },
  ],
  attendance: [],
  summary: { totalEmployees: 2, currentlyClockedIn: 0 },
};

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("employee roster page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json(bootstrap);
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the employee roster page and supports search", async () => {
    const user = userEvent.setup();
    renderWithManagerLayout(<EmployeeRosterPage />);

    expect(await screen.findByRole("heading", { name: "직원명부관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "직원 등록" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/new",
    );
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/emp-1",
    );
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText("현직")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "Bob");
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("퇴직")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("links the employee name to the edit page", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    await screen.findByText("Alice");
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/emp-1",
    );
  });

  it("does not show the manager home and exit links on the roster page", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    await screen.findByRole("heading", { name: "직원명부관리" });
    expect(screen.queryByRole("link", { name: "관리자화면으로" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "나가기" })).not.toBeInTheDocument();
  });

  it("exposes the roster route from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "직원명부관리" })).toHaveAttribute(
      "href",
      "/manager/employee/employees",
    );
  });
});
