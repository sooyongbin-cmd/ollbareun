import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AdminUsersPage from "./page";
afterEach(() => vi.unstubAllGlobals());
it("shows each subscription, hides repeated emails and deletes only after confirmation", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "DELETE" ? Response.json({ success: true }) : Response.json({
    admins: [{ id: "a", user_id: "u", email: "a@example.com", role: "admin" }], currentRole: "super_admin",
    subscriptions: [{ id: "s2", user_id: "u", updated_at: "2026-10-07T02:00:00Z" }, { id: "s1", user_id: "u", updated_at: "2026-10-07T01:00:00Z" }],
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminUsersPage />);
  await screen.findAllByRole("button", { name: /a@example.com.*구독삭제/ });
  expect(screen.getAllByText("a@example.com")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "관리자등록" })).toHaveAttribute("href", "/manager/system/admin-users/new");
  const deletes = screen.getAllByRole("button", { name: /구독삭제/ });
  await user.click(deletes[0]);
  expect(screen.getByText(/삭제하시면 푸시알림을 받을 수 없습니다/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "예" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/manager/admin-users/a/subscriptions/s1", { method: "DELETE" }));
});
