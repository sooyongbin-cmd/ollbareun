import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import EmployeeRosterPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/manager/employee/employees",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const bootstrap = {
  employees: [
    {
      id: "emp-1",
      name: "Alice",
      birthdate: "1966-01-02",
      phone: "010-1234-5678",
      phone_normalized: "01012345678",
      is_retired: false,
      role: "경비원",
    },
    {
      id: "emp-2",
      name: "Bob",
      birthdate: null,
      phone: "010-9999-8888",
      phone_normalized: "01099998888",
      is_retired: true,
      retired_at: "2020-04-03T00:00:00+09:00",
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
      id: "assign-1",
      employee_id: "emp-1",
      worksite_id: "work-1",
      start_date: "2026-05-01",
      end_date: "2026-05-24",
    },
  ],
  attendance: [{ employee_id: "emp-1", intime_status: "2" }],
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
        if (url.endsWith("/api/employee-roles")) {
          return Response.json({ roles: ["경비원", "미화원", "주차원", "사감"] });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders the employee roster page and supports search", async () => {
    const user = userEvent.setup();
    renderWithManagerLayout(<EmployeeRosterPage />);

    expect(await screen.findByRole("heading", { name: "직원관리" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "직원 등록" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/emp-1",
    );
    expect(screen.getByText("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "배정기간" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "퇴직일" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "출근" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "교육" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "생년월일" })).toBeInTheDocument();
    expect(screen.getByText("1966-01-02")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/education/resources");
    expect(fetch).not.toHaveBeenCalledWith("/api/education/completions");
    const aliceRow = screen.getByRole("link", { name: "Alice" }).closest("tr") as HTMLElement;
    expect(within(aliceRow).getByText("출근")).toBeInTheDocument();
    const assignmentPeriodLink = screen.getByRole("link", { name: "2026-05-01~2026-05-24" });
    expect(assignmentPeriodLink).toHaveAttribute("href", "/manager/employee/assignments/save/assign-1");
    expect(screen.queryByRole("link", { name: "Bob" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    expect(screen.getByRole("columnheader", { name: "퇴직일" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("이름"), "ob");
    expect(await screen.findByRole("link", { name: "Bob" })).toBeInTheDocument();
    expect(screen.getByText("2020-04-03")).toBeInTheDocument();
    const bobRow = screen.getByRole("link", { name: "Bob" }).closest("tr");
    expect(bobRow).not.toBeNull();
    expect(bobRow?.querySelector('[data-label="퇴직일"]')).toHaveTextContent("2020-04-03");
    expect(bobRow?.querySelector('[data-label="생년월일"]')).toHaveTextContent("-");
    expect(bobRow?.querySelector('[data-label="근무지"]')).toBeEmptyDOMElement();
    expect(bobRow?.querySelector('[data-label="배정기간"]')).toBeEmptyDOMElement();
    expect(bobRow?.querySelector('[data-label="출근"]')).toHaveTextContent("-");
    expect(screen.queryByRole("link", { name: "Alice" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    expect(screen.queryByRole("columnheader", { name: "퇴직일" })).not.toBeInTheDocument();
  });

  it("opens registration in a modal and preserves search when closed", async () => {
    const user = userEvent.setup();
    renderWithManagerLayout(<EmployeeRosterPage />);
    await screen.findByRole("link", { name: "Alice" });
    await user.type(screen.getByLabelText("이름"), "Alice");
    await user.click(screen.getByRole("button", { name: "직원 등록" }));
    const dialog = await screen.findByRole("dialog", { name: "직원등록" });
    expect(within(dialog).getByLabelText("직원이름")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toHaveValue("Alice");
  });

  it("refreshes the roster after saving registration and closes on confirmation", async () => {
    const user = userEvent.setup();
    let created = false;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/employee-roles")) return Response.json({ roles: ["경비원"] });
      if (url.endsWith("/api/employees")) {
        created = true;
        return Response.json({ employee: { id: "emp-3", name: "신규직원", phone: "01011112222", role: "경비원" } });
      }
      return Response.json({ ...bootstrap, employees: created
        ? [...bootstrap.employees, { ...bootstrap.employees[0], id: "emp-3", name: "신규직원" }]
        : bootstrap.employees });
    }));
    renderWithManagerLayout(<EmployeeRosterPage />);
    await screen.findByRole("link", { name: "Alice" });
    await user.click(screen.getByRole("button", { name: "직원 등록" }));
    const dialog = await screen.findByRole("dialog", { name: "직원등록" });
    await user.type(within(dialog).getByLabelText("직원이름"), "신규직원");
    await user.type(within(dialog).getByLabelText("생년월일"), "1975-06-15");
    await user.type(within(dialog).getByLabelText("연락처"), "01011112222");
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    await user.click(await screen.findByRole("button", { name: "확인" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "신규직원" })).toBeInTheDocument();
  });

  it("separates employee search controls from the employee list section", async () => {
    renderWithManagerLayout(<EmployeeRosterPage />);

    const searchSection = await screen.findByRole("region", { name: "직원 검색" });
    const listSection = await screen.findByRole("region", { name: "직원 목록" });

    expect(within(searchSection).queryByRole("heading", { name: "직원 검색" })).not.toBeInTheDocument();
    expect(searchSection).toContainElement(screen.getByLabelText("이름"));
    expect(screen.getByLabelText("이름")).toHaveAttribute("placeholder", "이름을 입력하세요.");
    expect(screen.getByLabelText("이름")).toHaveAttribute("list", "employee-roster-name-options");
    expect(Array.from(document.querySelectorAll<HTMLOptionElement>("#employee-roster-name-options option")).map((option) => option.value)).toEqual(["Alice"]);
    expect(searchSection).toContainElement(screen.getByLabelText("직군"));
    expect(Array.from((screen.getByLabelText("직군") as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "", "경비원", "미화원", "주차원", "사감",
    ]);
    expect(searchSection).toContainElement(screen.getByRole("checkbox", { name: "퇴직" }));
    expect(screen.getByRole("checkbox", { name: "퇴직" })).not.toBeChecked();
    expect(searchSection).toContainElement(screen.getByRole("button", { name: "직원 등록" }));
    expect(within(listSection).queryByRole("heading", { name: "직원 목록" })).not.toBeInTheDocument();
    expect(within(listSection).queryByText("전체 직원 1")).not.toBeInTheDocument();
    expect(listSection).toContainElement(screen.getByText("조회 결과 1"));
    expect(listSection).toContainElement(screen.getByRole("table"));
  });

  it("filters by worksite together with name and role", async () => {
    const user = userEvent.setup();
    renderWithManagerLayout(<EmployeeRosterPage />);
    await screen.findByRole("link", { name: "Alice" });

    const worksiteInput = screen.getByRole("combobox", { name: "근무지" });
    expect(worksiteInput).toHaveAttribute("list", "employee-roster-worksite-options");
    expect(document.querySelector("#employee-roster-worksite-options option")).toHaveAttribute("value", "본사");

    await user.type(worksiteInput, " 본 ");
    await user.type(screen.getByRole("combobox", { name: "이름" }), "Alice");
    await user.selectOptions(screen.getByRole("combobox", { name: "직군" }), "경비원");
    expect(screen.getByRole("link", { name: "Alice" })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "직군" }), "미화원");
    expect(screen.queryByRole("link", { name: "Alice" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "직군" }), "경비원");
    await user.clear(worksiteInput);
    await user.type(worksiteInput, "없는 근무지");
    expect(screen.queryByRole("link", { name: "Alice" })).not.toBeInTheDocument();
    await user.clear(worksiteInput);
    expect(screen.getByRole("link", { name: "Alice" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    expect(worksiteInput).toHaveValue("");
    expect(screen.getByRole("link", { name: "Bob" })).toBeInTheDocument();
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
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json(extendedBootstrap);
      }
      if (url.endsWith("/api/employee-roles")) {
        return Response.json({ roles: ["경비원", "미화원", "주차원", "사감"] });
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
