import { render, screen, within } from "@testing-library/react";
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
      role: "경비원",
    },
    {
      id: "emp-2",
      name: "Bob",
      phone: "010-9999-8888",
      phone_normalized: "01099998888",
      is_retired: true,
      role: "미화원",
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

    expect(await screen.findByRole("heading", { name: "직원관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "직원 등록" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/new",
    );
    expect(await screen.findByRole("link", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/emp-1",
    );
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText("현직")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bob" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    await user.selectOptions(screen.getByLabelText("이름"), "Bob");
    expect(await screen.findByRole("link", { name: "Bob" })).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("퇴직")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Alice" })).not.toBeInTheDocument();
  });

  it("separates employee search controls from the employee list section", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    const searchSection = await screen.findByRole("region", { name: "직원 검색" });
    const listSection = await screen.findByRole("region", { name: "직원 목록" });

    expect(within(searchSection).queryByRole("heading", { name: "직원 검색" })).not.toBeInTheDocument();
    expect(searchSection).toContainElement(screen.getByLabelText("이름"));
    expect(searchSection).toContainElement(screen.getByLabelText("역할"));
    expect(searchSection).toContainElement(screen.getByRole("checkbox", { name: "퇴직" }));
    expect(screen.getByRole("checkbox", { name: "퇴직" })).not.toBeChecked();
    expect(searchSection).toContainElement(screen.getByRole("link", { name: "직원 등록" }));
    expect(within(listSection).queryByRole("heading", { name: "직원 목록" })).not.toBeInTheDocument();
    expect(listSection).toContainElement(screen.getByText("전체 직원 2"));
    expect(listSection).toContainElement(screen.getByText("검색 결과 1"));
    expect(listSection).toContainElement(screen.getByRole("table"));
  });

  it("links the employee name to the edit page", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    await screen.findByRole("link", { name: "Alice" });
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/emp-1",
    );
  });

  it("does not show the manager home and exit links on the roster page", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    await screen.findByRole("heading", { name: "직원관리" });
    expect(screen.queryByRole("link", { name: "관리자화면으로" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "나가기" })).not.toBeInTheDocument();
  });

  it("exposes the roster route from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "직원관리" })).toHaveAttribute(
      "href",
      "/manager/employee/employees",
    );
  });

  it("sorts employees by name", async () => {
    const user = userEvent.setup();
    const extendedBootstrap = {
      ...bootstrap,
      employees: [
        { id: "emp-1", name: "Alice", phone: "010-1234-5678", phone_normalized: "01012345678", is_retired: false, role: "경비원" },
        { id: "emp-3", name: "Charlie", phone: "010-1111-2222", phone_normalized: "01011112222", is_retired: false, role: "경비원" },
        { id: "emp-2", name: "Bob", phone: "010-9999-8888", phone_normalized: "01099998888", is_retired: true, role: "미화원" },
      ]
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/bootstrap")) {
        return Response.json(extendedBootstrap);
      }
      return Response.json({}, { status: 404 });
    }));

    renderWithManagerLayout(<EmployeeRosterPage />);

    // Wait for rows to load
    await screen.findAllByRole("row");

    // Initially sorted ASC by name: Alice, Charlie
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Alice")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Charlie")).toBeInTheDocument();

    // Click "이름" header to sort DESC: Charlie first, then Alice
    const nameHeader = screen.getByRole("columnheader", { name: "이름" });
    await user.click(nameHeader);

    const updatedRows = screen.getAllByRole("row");
    expect(within(updatedRows[1]).getByText("Charlie")).toBeInTheDocument();
    expect(within(updatedRows[2]).getByText("Alice")).toBeInTheDocument();
  });
});
