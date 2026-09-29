import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { POST } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

const request = (body: unknown) => new Request("http://localhost/api/manager/education/completions/generate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

function database(rows: { id: string; employee_id: string; work_date: string }[]) {
  const query = {
    select: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null })),
  };
  const db = { from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ error: null }) };
  vi.mocked(getSupabaseAdmin).mockReturnValue(db as never);
  return { db, query };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getManagerUser).mockResolvedValue({ id: "manager" } as never);
});

describe("attendance education generation", () => {
  it("requires manager authentication before reading or generating records", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    const response = await POST(request({ from: "2026-09-01", to: "2026-09-30" }));
    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it.each([
    {}, { from: "", to: "2026-09-30" },
    { from: "2026-02-30", to: "2026-09-30" },
    { from: "2026-09-30", to: "2026-09-01" },
    { from: "2026-09-01", to: "2026-09-30", page: 0 },
  ])("rejects invalid ranges or pages before any database operation: %j", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("processes every page in date order through the attendance save's common RPC", async () => {
    const rows = Array.from({ length: 28 }, (_, index) => ({
      id: `record-${index}`, employee_id: `employee-${index}`,
      work_date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    }));
    const { db, query } = database(rows);
    const first = await POST(request({ from: "2026-09-01", to: "2026-09-30" }));
    expect(await first.json()).toEqual({ processedCount: 25, hasMore: true, nextPage: 2 });
    const last = await POST(request({ from: "2026-09-01", to: "2026-09-30", page: 2 }));
    expect(await last.json()).toEqual({ processedCount: 3, hasMore: false, nextPage: 3 });
    expect(query.not).toHaveBeenCalledWith("work_intime", "is", null);
    expect(query.gte).toHaveBeenCalledWith("work_date", "2026-09-01");
    expect(query.lte).toHaveBeenCalledWith("work_date", "2026-09-30");
    expect(query.order.mock.calls.slice(0, 3)).toEqual([["work_date", { ascending: true }], ["employee_id"], ["id"]]);
    expect(db.rpc.mock.calls).toEqual(rows.map((row) => ["ensure_attendance_education", {
      p_employee_id: row.employee_id, p_date: row.work_date,
    }]));
  });

  it("reports partial progress and stops when generation fails", async () => {
    const { db } = database([
      { id: "1", employee_id: "employee", work_date: "2026-09-01" },
      { id: "2", employee_id: "employee", work_date: "2026-09-02" },
      { id: "3", employee_id: "employee", work_date: "2026-09-03" },
    ]);
    db.rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "failed" } });
    const response = await POST(request({ from: "2026-09-01", to: "2026-09-30" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "안전교육이수자료 생성에 실패했습니다.", processedCount: 1 });
    expect(db.rpc).toHaveBeenCalledTimes(2);
  });

  it("finishes without generating anything when there is no attendance", async () => {
    const { db } = database([]);
    const response = await POST(request({ from: "2026-09-01", to: "2026-09-30" }));
    expect(await response.json()).toEqual({ processedCount: 0, hasMore: false, nextPage: 2 });
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
