import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PATCH } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000001";
const context = () => ({ params: Promise.resolve({ id }) });
const request = (body: unknown) => new Request(`http://localhost/api/manager/education/completions/${id}`, {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function database(isCompleted: boolean) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
      .mockResolvedValueOnce({ data: { id, is_completed: isCompleted, completed_at: isCompleted ? "2026-09-28T00:00:00Z" : null }, error: null })
      .mockResolvedValueOnce({ data: { id }, error: null }),
  };
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn(() => query) } as never);
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
});

describe("completion timestamp editing", () => {
  it.each([false, true])("saves the entered Korean time even when the previous completion status is %s", async (wasCompleted) => {
    const query = database(wasCompleted);
    const response = await PATCH(request({ isCompleted: true, completedAt: "2024-02-29T00:05:12" }), context());
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ is_completed: true, completed_at: "2024-02-28T15:05:12.000Z" });
  });

  it("accepts datetime-local values without seconds", async () => {
    const query = database(false);
    const response = await PATCH(request({ isCompleted: true, completedAt: "2026-09-15T17:30" }), context());
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ is_completed: true, completed_at: "2026-09-15T08:30:00.000Z" });
  });

  it("accepts browser-normalized datetime-local values with milliseconds", async () => {
    const query = database(false);
    const response = await PATCH(request({ isCompleted: true, completedAt: "2026-09-15T17:30:00.000" }), context());
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ is_completed: true, completed_at: "2026-09-15T08:30:00.000Z" });
  });

  it.each([undefined, "", "2026-02-30T10:00", "2026-09-29T24:00", "2026-09-29T12:60", "2026-09-29T10:00Z"])("rejects invalid completedAt %s instead of replacing it with now", async (completedAt) => {
    const response = await PATCH(request({ isCompleted: true, completedAt }), context());
    expect(response.status).toBe(400);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("clears completion time when returning to incomplete", async () => {
    const query = database(true);
    const response = await PATCH(request({ isCompleted: false, completedAt: "2026-09-15T17:30" }), context());
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ is_completed: false, completed_at: null });
  });

  it("requires manager authentication", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    expect((await PATCH(request({ isCompleted: true, completedAt: "2026-09-15T17:30" }), context())).status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
