import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteAssignment, deleteAssignmentAfterToday, deleteAssignmentIncludingAttendance } from "@/lib/phase1-data";
import { DELETE } from "./route";

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/phase1-data", () => ({
  deleteAssignment: vi.fn(),
  deleteAssignmentAfterToday: vi.fn(),
  deleteAssignmentIncludingAttendance: vi.fn(),
}));

describe("DELETE /api/assignments/[id]", () => {
  const supabase = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(supabase as never);
  });

  it("uses the protected delete flow by default", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/assignments/assign-1"),
      { params: Promise.resolve({ id: "assign-1" }) },
    );

    expect(response.status).toBe(204);
    expect(deleteAssignment).toHaveBeenCalledWith("assign-1", supabase);
    expect(deleteAssignmentIncludingAttendance).not.toHaveBeenCalled();
  });

  it("uses the attendance-inclusive delete flow when requested", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/assignments/assign-1?includeAttendance=true"),
      { params: Promise.resolve({ id: "assign-1" }) },
    );

    expect(response.status).toBe(204);
    expect(deleteAssignmentIncludingAttendance).toHaveBeenCalledWith("assign-1", supabase);
    expect(deleteAssignment).not.toHaveBeenCalled();
  });

  it("uses the after-today delete flow when requested", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/assignments/assign-1?afterToday=true"),
      { params: Promise.resolve({ id: "assign-1" }) },
    );

    expect(response.status).toBe(204);
    expect(deleteAssignmentAfterToday).toHaveBeenCalledWith("assign-1", supabase);
    expect(deleteAssignment).not.toHaveBeenCalled();
    expect(deleteAssignmentIncludingAttendance).not.toHaveBeenCalled();
  });
});
