import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeavePage from "./page";

describe("leave page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows leave rows, filters by name, and links to the detail page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/bootstrap")) {
        return Response.json({ employees: [{ id: "emp-1", name: "홍길동", is_retired: false }, { id: "emp-2", name: "김철수", is_retired: false }] });
      }
      return Response.json({ leaves: [{
        id: "leave-1",
        employeeName: "홍길동",
        employeeRole: "경비원",
        workStyle: "일반근무",
        leaveType: "2",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        worksiteName: "본사",
        assignmentStartDate: "2026-05-01",
        assignmentEndDate: "2026-06-30",
      }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LeavePage />);

    expect(await screen.findByRole("heading", { name: "휴가관리" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "홍길동" })).toHaveAttribute("href", "/manager/leave/leave-1");
    expect(screen.getByRole("columnheader", { name: "이름" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "직군" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "근무형태" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "휴가종류" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "휴가기간" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "근무지" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "배정기간" })).toBeInTheDocument();
    expect(screen.getByText("경비원")).toBeInTheDocument();
    expect(screen.getByText("일반근무")).toBeInTheDocument();
    expect(screen.getByText("연차")).toBeInTheDocument();
    expect(screen.getByText("2026-06-01 ~ 2026-06-03")).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText("2026-05-01 ~ 2026-06-30")).toBeInTheDocument();
    await user.type(screen.getByLabelText("이름"), "김철수");
    await waitFor(() => expect(screen.getByText("조회 결과에 해당하는 휴가가 없습니다.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "휴가신청" })).toHaveAttribute("href", "/manager/leave/new");
  });
});
