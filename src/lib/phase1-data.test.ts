import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateGuard, createAssignment } from "./phase1-data";
import { getSupabase } from "./supabase";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

describe("guard authentication data rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T09:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects retired employees before creating a guard session", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: true,
          role: "경비원",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(employeeQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      authenticateGuard({ name: "홍길동", phone: "010-1234-5678" }),
    ).rejects.toThrow("해당직원은 퇴직처리되었습니다.");
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("employees");
  });

  it("finds today's assignment when today is inside the assignment period", async () => {
    const employeeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "emp-1",
          name: "홍길동",
          phone: "010-1234-5678",
          phone_normalized: "01012345678",
          is_retired: false,
          role: "경비원",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "assign-1",
          employee_id: "emp-1",
          worksite_id: "work-1",
          start_date: "2026-05-25",
          end_date: "2026-05-27",
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const worksiteQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "work-1",
          name: "본사",
          gps_info: { latitude: 37.5, longitude: 127 },
          radius_meters: 100,
          created_at: "2026-05-21T00:00:00Z",
        },
        error: null,
      }),
    };
    const attendanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(worksiteQuery)
        .mockReturnValueOnce(attendanceQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(authenticateGuard({ name: "홍길동", phone: "010-1234-5678" })).resolves.toMatchObject({
      assignment: { id: "assign-1" },
      worksite: { id: "work-1" },
    });
    expect(assignmentQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(assignmentQuery.lte).toHaveBeenCalledWith("start_date", "2026-05-26");
    expect(assignmentQuery.gte).toHaveBeenCalledWith("end_date", "2026-05-26");
  });

  it("rejects overlapping assignment periods for the same employee", async () => {
    const overlapQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "assign-1" },
        error: null,
      }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue(overlapQuery),
    };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      createAssignment({
        employeeId: "emp-1",
        worksiteId: "work-1",
        startDate: "2026-05-25",
        endDate: "2026-05-27",
      }),
    ).rejects.toThrow("이미 겹치는 근무기간 배정이 있습니다.");
    expect(overlapQuery.lte).toHaveBeenCalledWith("start_date", "2026-05-27");
    expect(overlapQuery.gte).toHaveBeenCalledWith("end_date", "2026-05-25");
  });
});
