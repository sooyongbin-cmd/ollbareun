import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import NewAdminUserPage from "./page";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { vi.unstubAllGlobals(); push.mockClear(); });
it("registers the email and role then returns to the list", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => Response.json({ admin: { id: "a" } }));
  vi.stubGlobal("fetch", fetchMock);
  render(<NewAdminUserPage />);
  await user.type(screen.getByLabelText("관리자이메일"), "new@example.com");
  await user.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/manager/system/admin-users"));
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/admin-users", expect.objectContaining({ body: JSON.stringify({ email: "new@example.com", role: "admin" }) }));
});
