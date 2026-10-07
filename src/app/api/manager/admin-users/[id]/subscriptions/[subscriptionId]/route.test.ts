import { beforeEach, expect, it, vi } from "vitest";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { deleteAdminPushSubscription } from "@/lib/admin-push-subscriptions";
import { DELETE } from "./route";
vi.mock("@/lib/manager-auth", () => ({ getManagerUserWithRole: vi.fn() }));
vi.mock("@/lib/admin-push-subscriptions", () => ({ deleteAdminPushSubscription: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const request = new Request("http://localhost/api/manager/admin-users/a/subscriptions/s", { method: "DELETE" });
const context = { params: Promise.resolve({ id: "a", subscriptionId: "s" }) };
it("requires authentication", async () => {
  vi.mocked(getManagerUserWithRole).mockResolvedValue(null);
  expect((await DELETE(request, context)).status).toBe(401);
  expect(deleteAdminPushSubscription).not.toHaveBeenCalled();
});
it("requires super admin permission", async () => {
  vi.mocked(getManagerUserWithRole).mockResolvedValue({ adminUser: { role: "admin" } } as never);
  expect((await DELETE(request, context)).status).toBe(403);
  expect(deleteAdminPushSubscription).not.toHaveBeenCalled();
});
it("deletes exactly the requested admin subscription", async () => {
  vi.mocked(getManagerUserWithRole).mockResolvedValue({ adminUser: { role: "super_admin" } } as never);
  expect((await DELETE(request, context)).status).toBe(200);
  expect(deleteAdminPushSubscription).toHaveBeenCalledWith("a", "s");
});
