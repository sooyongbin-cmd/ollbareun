import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AdminUserDetailPage from "./page";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "a" }), useRouter: () => ({ push }) }));
afterEach(() => { vi.unstubAllGlobals(); push.mockClear(); });
function mockFetch() {
  const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => options?.method ? Response.json({ success: true }) : Response.json({ admin: { email: "a@example.com", role: "admin" }, canEdit: true }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
it("loads and saves edited email and role", async () => {
  const fetchMock = mockFetch();
  const user = userEvent.setup();
  render(<AdminUserDetailPage />);
  const email = await screen.findByLabelText("관리자이메일");
  expect(email).toHaveValue("a@example.com");
  await user.clear(email);
  await user.type(email, "b@example.com");
  await user.selectOptions(screen.getByLabelText("직군"), "super_admin");
  expect(screen.getByRole("button", { name: "목록" })).toHaveClass("ml-auto");
  await user.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/manager/system/admin-users"));
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/admin-users/a", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ email: "b@example.com", role: "super_admin" }) }));
});
it("deletes only after confirmation", async () => {
  const fetchMock = mockFetch();
  const user = userEvent.setup();
  render(<AdminUserDetailPage />);
  await screen.findByLabelText("관리자이메일");
  await user.click(screen.getByRole("button", { name: "삭제" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "예" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/manager/admin-users/a", { method: "DELETE" }));
});
