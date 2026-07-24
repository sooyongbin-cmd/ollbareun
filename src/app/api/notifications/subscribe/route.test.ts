import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSupabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));
vi.mock("@/lib/active-employee", () => ({
  requireActiveEmployee: vi.fn().mockResolvedValue({ id: "emp-1" }),
  getActiveEmployeeErrorStatus: (_error: unknown, fallback: number) => fallback,
}));

describe("POST /api/notifications/subscribe", () => {
  let mockSupabase: { from: ReturnType<typeof vi.fn> };
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockDeleteEq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    mockDelete = vi.fn().mockImplementation(() => ({
      eq: mockDeleteEq,
    }));

    mockUpsert = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            employee_id: "emp-1",
            endpoint: "https://push.example.test/sub-1",
          },
          error: null,
        }),
      })),
    }));

    mockSupabase = {
      from: vi.fn((table) => {
        if (table === "push_subscriptions") {
          return {
            delete: mockDelete,
            upsert: mockUpsert,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(getSupabase).mockReturnValue(mockSupabase as never);
  });

  it("deletes any existing subscription with the same endpoint before upserting the new one", async () => {
    const request = new Request("http://localhost/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: "emp-1",
        subscription: {
          endpoint: "https://push.example.test/sub-1",
          keys: {
            p256dh: "key-1",
            auth: "auth-1",
          },
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify delete was called on push_subscriptions with the endpoint
    expect(mockSupabase.from).toHaveBeenCalledWith("push_subscriptions");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("endpoint", "https://push.example.test/sub-1");

    // Verify upsert was called with employeeId and subscription details
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: "emp-1",
        endpoint: "https://push.example.test/sub-1",
      }),
      expect.objectContaining({
        onConflict: "employee_id",
      })
    );
  });
});
