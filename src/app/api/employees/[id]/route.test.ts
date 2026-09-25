import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { deleteEmployee } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DELETE } from "./route";

vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/phase1-data", () => ({ deleteEmployee: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("DELETE /api/employees/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes related records before deleting the employee", async () => {
    const operationOrder: string[] = [];
    const supabase = {
      from: vi.fn((table: string) => ({
        delete: vi.fn(() => ({
          eq: vi.fn(async (column: string, value: string) => {
            operationOrder.push(`${table}.${column}=${value}`);
            return { error: null };
          }),
        })),
      })),
    };
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);
    vi.mocked(deleteEmployee).mockImplementation(async () => {
      operationOrder.push("employee");
    });

    const response = await DELETE(new Request("http://localhost/api/employees/employee-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "employee-1" }),
    });

    expect(response.status).toBe(204);
    expect(operationOrder).toEqual([
      "education_completions.employee_id=employee-1",
      "work_record.employee_id=employee-1",
      "leave.employee_id=employee-1",
      "inspection_logs.employee_id=employee-1",
      "inspection_special_reports.employee_id=employee-1",
      "work_assignments.employee_id=employee-1",
      "employee",
    ]);
  });
});
