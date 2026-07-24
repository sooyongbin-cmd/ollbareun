import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import AssignmentManagementPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/manager/employee/assignments",
}));

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("assignment management page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/assignments")) {
          return Response.json({
            assignments: [
              {
                id: "assign-1",
                start_date: "2026-05-21",
                end_date: "2026-05-23",
                employee_name: "홍길동",
                worksite_name: "본사",
                days_off_count: 2,
              },
              {
                id: "assign-2",
                start_date: "2026-05-24",
                end_date: "2026-05-25",
                employee_name: "김철수",
                worksite_name: "서울지점",
                days_off_count: 0,
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders assignment periods, filters by included date, and opens edit page", async () => {
    const user = userEvent.setup();

    renderWithManagerLayout(<AssignmentManagementPage />);

    expect(await screen.findByRole("heading", { name: "근무지배정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "배정등록" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments/new",
    );
    expect(screen.getByRole("columnheader", { name: "휴무" })).toBeInTheDocument();

    const row = await screen.findByRole("link", { name: "홍길동" });
    expect(within(row).getByText("2026-05-21 ~ 2026-05-23")).toBeInTheDocument();
    expect(within(row).getByText("본사")).toBeInTheDocument();
    expect(within(row).getByText("2일")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "근무지" })).toHaveValue("");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "전체",
      "본사",
      "서울지점",
    ]);

    await user.type(screen.getByLabelText("날짜"), "2026-05-22");
    expect(await screen.findByRole("link", { name: "홍길동" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "김철수" })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("날짜"));
    await user.selectOptions(screen.getByLabelText("근무지"), "서울지점");
    expect(screen.queryByRole("link", { name: "홍길동" })).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "김철수" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("근무지"), "");
    await user.type(screen.getByLabelText("이름"), "김철수");
    await user.click(await screen.findByRole("link", { name: "김철수" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments/save/assign-2");
  });

  it("separates assignment search controls from the assignment list section", async () => {
    renderWithManagerLayout(<AssignmentManagementPage />);

    const searchSection = await screen.findByRole("region", { name: "배정 검색" });
    const listSection = await screen.findByRole("region", { name: "배정 목록" });

    expect(searchSection).toContainElement(screen.getByLabelText("날짜"));
    expect(searchSection).toContainElement(screen.getByLabelText("근무지"));
    expect(searchSection).toContainElement(screen.getByLabelText("이름"));
    expect(searchSection).toContainElement(screen.getByRole("link", { name: "배정등록" }));
    expect(listSection).toContainElement(screen.getByText("전체 배정 2"));
    expect(listSection).toContainElement(screen.getByText("조회 결과 2"));
    expect(listSection).toContainElement(screen.getByRole("table"));
  });

  it("exposes assignment management from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "근무지배정" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments",
    );
  });

  it("sorts assignments by date, worksite name, employee name, and days off", async () => {
    const user = userEvent.setup();

    const { container } = renderWithManagerLayout(<AssignmentManagementPage />);

    // Wait for the data to load by finding one of the names
    await screen.findByText("김철수");

    // By default, sorted DESC by start_date: assign-2 ("2026-05-24") first, then assign-1 ("2026-05-21")
    let trs = container.querySelectorAll("tbody tr");
    expect(within(trs[0] as HTMLElement).getByText("김철수")).toBeInTheDocument();
    expect(within(trs[1] as HTMLElement).getByText("홍길동")).toBeInTheDocument();

    // Click "날짜" to sort ASC: assign-1 first, then assign-2
    const dateHeader = screen.getByRole("columnheader", { name: "날짜" });
    await user.click(dateHeader);

    trs = container.querySelectorAll("tbody tr");
    expect(within(trs[0] as HTMLElement).getByText("홍길동")).toBeInTheDocument();
    expect(within(trs[1] as HTMLElement).getByText("김철수")).toBeInTheDocument();

    // Click "휴무" to sort ASC: assign-2 (0일) first, then assign-1 (2일)
    const daysOffHeader = screen.getByRole("columnheader", { name: "휴무" });
    await user.click(daysOffHeader);

    trs = container.querySelectorAll("tbody tr");
    expect(within(trs[0] as HTMLElement).getByText("김철수")).toBeInTheDocument();
    expect(within(trs[1] as HTMLElement).getByText("홍길동")).toBeInTheDocument();

    // Click "이름" to sort ASC: 김철수 (김) first, then 홍길동 (홍)
    const nameHeader = screen.getByRole("columnheader", { name: "이름" });
    await user.click(nameHeader);

    trs = container.querySelectorAll("tbody tr");
    expect(within(trs[0] as HTMLElement).getByText("김철수")).toBeInTheDocument();
    expect(within(trs[1] as HTMLElement).getByText("홍길동")).toBeInTheDocument();
  });
});
