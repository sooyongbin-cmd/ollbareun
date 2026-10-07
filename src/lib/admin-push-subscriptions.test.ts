import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "./supabase-admin";
import { deleteAdminPushSubscription, listAdminPushSubscriptions } from "./admin-push-subscriptions";
import { buildAdminSubscriptionRows } from "./admin-subscription-rows";
import type { AdminUserRow } from "./admin-users";

vi.mock("./supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
describe("admin subscription management", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps unsubscribed admins and sorts every subscription by email then access time", () => {
    const admins = [
      { id: "b", user_id: "ub", email: "b@example.com" },
      { id: "a", user_id: "ua", email: "a@example.com" },
      { id: "c", user_id: null, email: "c@example.com" },
    ] as AdminUserRow[];
    const rows = buildAdminSubscriptionRows(admins, [
      { id: "s2", user_id: "ua", updated_at: "2026-10-07T02:00:00Z" },
      { id: "s1", user_id: "ua", updated_at: "2026-10-07T01:00:00Z" },
      { id: "other", user_id: "unknown", updated_at: "2026-10-07T00:00:00Z" },
    ]);
    expect(rows.map((row) => [row.admin.id, row.subscription?.id ?? null])).toEqual([
      ["a", "s1"], ["a", "s2"], ["b", null], ["c", null],
    ]);
  });
  it("only deletes the selected subscription belonging to the selected admin", async () => {
    const eq = vi.fn().mockReturnThis();
    const subscriptionQuery = { delete: vi.fn().mockReturnThis(), eq, select: vi.fn().mockResolvedValue({ data: [{ id: "s1" }], error: null }) };
    const adminQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { user_id: "ua" }, error: null }) };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: (table: string) => table === "admin_users" ? adminQuery : subscriptionQuery } as never);
    await deleteAdminPushSubscription("a", "s1");
    expect(adminQuery.eq).toHaveBeenCalledWith("id", "a");
    expect(eq.mock.calls).toEqual([["id", "s1"], ["user_id", "ua"]]);
  });
  it("rejects a subscription that is missing or belongs to another admin", async () => {
    const query = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const admin = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { user_id: "ua" }, error: null }) };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: (table: string) => table === "admin_users" ? admin : query } as never);
    await expect(deleteAdminPushSubscription("a", "other")).rejects.toThrow("해당 관리자의 구독을 찾을 수 없습니다.");
  });
  it("reads subscription metadata without exposing push credentials", async () => {
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: [], error: null }) };
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: () => query } as never);
    expect(await listAdminPushSubscriptions()).toEqual([]);
    expect(query.select).toHaveBeenCalledWith("id,user_id,updated_at");
  });
});
