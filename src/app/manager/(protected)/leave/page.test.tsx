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
      return Response.json({ leaves: [{ id: "leave-1", employeeName: "홍길동", leaveType: "2", startDate: "2026-06-01", endDate: "2026-06-03" }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LeavePage />);

    expect(await screen.findByRole("heading", { name: "휴가관리" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "홍길동" })).toHaveAttribute("href", "/manager/leave/leave-1");
    expect(screen.getByText("연차")).toBeInTheDocument();
    expect(screen.getByText("2026-06-01 ~ 2026-06-03")).toBeInTheDocument();
    await user.type(screen.getByLabelText("이름"), "김철수");
    await waitFor(() => expect(screen.getByText("조회 결과에 해당하는 휴가가 없습니다.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "휴가신청" })).toHaveAttribute("href", "/manager/leave/new");
  });
});
