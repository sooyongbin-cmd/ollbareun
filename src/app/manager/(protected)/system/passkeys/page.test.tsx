import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerPasskeyRequestsPage from "./page";

describe("manager passkey requests page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders passkey requests and approves a pending request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          requests: [
            {
              id: "req-1",
              employeeName: "홍길동",
              employeePhone: "010-1234-5678",
              employeeRetired: false,
              status: "pending",
              requestedAt: "2026-06-08T00:00:00Z",
              reviewedAt: null,
              reviewedBy: null,
              registeredAt: null,
              revokedAt: null,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ request: { id: "req-1", status: "approved" } }))
      .mockResolvedValueOnce(Response.json({ requests: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ManagerPasskeyRequestsPage />);

    expect(await screen.findByRole("heading", { name: "패스키 요청 관리" })).toBeInTheDocument();
    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/manager/guard-passkey-requests/req-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", reviewedBy: "manager" }),
      });
    });
    expect(await screen.findByText("패스키 요청 목록이 없습니다.")).toBeInTheDocument();
  });
});
