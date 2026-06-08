import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveGuardPasskeyRequest,
  completeGuardPasskeyRegistration,
  createGuardPasskeyRequest,
  createGuardPasskeyRegistrationCredential,
  createGuardSessionFromAuthToken,
  listGuardPasskeyRequests,
  loadGuardPasskeyRequestForEmployee,
  rejectGuardPasskeyRequest,
  revokeGuardPasskey,
} from "./guard-passkeys";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

vi.mock("./supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function query(result: unknown = { data: null, error: null }) {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return queryBuilder;
}

describe("guard passkey data flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a pending request for an active employee", async () => {
    const employeeQuery = query({
      data: { id: "emp-1", name: "홍길동", is_retired: false },
      error: null,
    });
    const requestQuery = query({
      data: { id: "req-1", employee_id: "emp-1", status: "pending" },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(employeeQuery).mockReturnValueOnce(requestQuery),
    } as never);

    await expect(createGuardPasskeyRequest("emp-1")).resolves.toMatchObject({
      id: "req-1",
      status: "pending",
    });
    expect(requestQuery.insert).toHaveBeenCalledWith({ employee_id: "emp-1" });
  });

  it("rejects passkey requests for retired employees", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue(
        query({
          data: { id: "emp-1", name: "홍길동", is_retired: true },
          error: null,
        }),
      ),
    } as never);

    await expect(createGuardPasskeyRequest("emp-1")).rejects.toThrow("퇴직 처리된 경비원은 패스키를 요청할 수 없습니다.");
  });

  it("loads the latest request for an employee", async () => {
    const requestQuery = query({
      data: { id: "req-1", employee_id: "emp-1", status: "approved" },
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from: vi.fn().mockReturnValue(requestQuery) } as never);

    await expect(loadGuardPasskeyRequestForEmployee("emp-1")).resolves.toMatchObject({ status: "approved" });
    expect(requestQuery.eq).toHaveBeenCalledWith("employee_id", "emp-1");
    expect(requestQuery.order).toHaveBeenCalledWith("requested_at", { ascending: false });
    expect(requestQuery.limit).toHaveBeenCalledWith(1);
  });

  it("lists manager approval rows with employee details", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue(
        query({
          data: [
            {
              id: "req-1",
              employee_id: "emp-1",
              status: "pending",
              requested_at: "2026-06-08T00:00:00Z",
              employees: { name: "홍길동", phone: "010-1234-5678", is_retired: false },
            },
          ],
          error: null,
        }),
      ),
    } as never);

    await expect(listGuardPasskeyRequests()).resolves.toEqual([
      expect.objectContaining({
        id: "req-1",
        employeeName: "홍길동",
        employeePhone: "010-1234-5678",
      }),
    ]);
  });

  it("approves, rejects, and revokes requests through status updates", async () => {
    const approveQuery = query({ data: { id: "req-1", status: "approved" }, error: null });
    const rejectQuery = query({ data: { id: "req-2", status: "rejected" }, error: null });
    const revokeRequestQuery = query({ data: { id: "req-3", employee_id: "emp-1", status: "revoked" }, error: null });
    const employeeUpdateQuery = query({ data: { id: "emp-1" }, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(approveQuery)
        .mockReturnValueOnce(rejectQuery)
        .mockReturnValueOnce(revokeRequestQuery)
        .mockReturnValueOnce(employeeUpdateQuery),
    } as never);

    await approveGuardPasskeyRequest("req-1", "관리자");
    await rejectGuardPasskeyRequest("req-2", "관리자");
    await revokeGuardPasskey("req-3", "관리자");

    expect(approveQuery.update).toHaveBeenCalledWith({
      status: "approved",
      reviewed_at: expect.any(String),
      reviewed_by: "관리자",
      updated_at: expect.any(String),
    });
    expect(rejectQuery.update).toHaveBeenCalledWith({
      status: "rejected",
      reviewed_at: expect.any(String),
      reviewed_by: "관리자",
      updated_at: expect.any(String),
    });
    expect(employeeUpdateQuery.update).toHaveBeenCalledWith({
      passkey_enabled: false,
    });
  });

  it("creates an auth user and temporary registration credential for approved requests", async () => {
    const requestQuery = query({
      data: {
        id: "req-1",
        employee_id: "emp-1",
        status: "approved",
        employees: { name: "홍길동", phone: "010-1234-5678", auth_user_id: null },
      },
      error: null,
    });
    const employeeUpdateQuery = query({ data: { id: "emp-1" }, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(requestQuery).mockReturnValueOnce(employeeUpdateQuery),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
          updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
        },
      },
    } as never);

    const result = await createGuardPasskeyRegistrationCredential("emp-1");

    expect(result.email).toBe("guard-emp-1@ollbareun-passkey.local");
    expect(result.password.length).toBeGreaterThan(20);
    expect(employeeUpdateQuery.update).toHaveBeenCalledWith({ auth_user_id: "auth-1" });
  });

  it("reuses an existing auth user when a previously revoked employee registers again", async () => {
    const requestQuery = query({
      data: {
        id: "req-1",
        employee_id: "emp-1",
        status: "approved",
        employees: { name: "홍길동", phone: "010-1234-5678", auth_user_id: null },
      },
      error: null,
    });
    const employeeUpdateQuery = query({ data: { id: "emp-1" }, error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    });
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: "auth-existing", email: "guard-emp-1@ollbareun-passkey.local" }] },
      error: null,
    });
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: { id: "auth-existing" } }, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(requestQuery).mockReturnValueOnce(employeeUpdateQuery),
      auth: {
        admin: {
          createUser,
          listUsers,
          updateUserById,
        },
      },
    } as never);

    const result = await createGuardPasskeyRegistrationCredential("emp-1");

    expect(result.email).toBe("guard-emp-1@ollbareun-passkey.local");
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
    expect(updateUserById).toHaveBeenCalledWith("auth-existing", { password: expect.any(String) });
    expect(employeeUpdateQuery.update).toHaveBeenCalledWith({ auth_user_id: "auth-existing" });
  });

  it("marks registration complete and rotates the temporary password", async () => {
    const requestQuery = query({
      data: { id: "req-1", employee_id: "emp-1", status: "approved", employees: { auth_user_id: "auth-1" } },
      error: null,
    });
    const updateQuery = query({ data: { id: "req-1", status: "registered" }, error: null });
    const employeeUpdateQuery = query({ data: { id: "emp-1" }, error: null });
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null });
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(requestQuery).mockReturnValueOnce(updateQuery).mockReturnValueOnce(employeeUpdateQuery),
      auth: { admin: { updateUserById } },
    } as never);

    await completeGuardPasskeyRegistration("emp-1");

    expect(updateUserById).toHaveBeenCalledWith("auth-1", { password: expect.any(String) });
    expect(updateQuery.update).toHaveBeenCalledWith({
      status: "registered",
      registered_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it("creates the legacy guard session from a verified passkey auth token", async () => {
    const employeeQuery = query({
      data: {
        id: "emp-1",
        name: "홍길동",
        phone: "010-1234-5678",
        phone_normalized: "01012345678",
        is_retired: false,
        created_at: "2026-06-01T00:00:00Z",
      },
      error: null,
    });
    const employeeByIdQuery = query({
      data: {
        id: "emp-1",
        name: "홍길동",
        phone: "010-1234-5678",
        phone_normalized: "01012345678",
        is_retired: false,
        created_at: "2026-06-01T00:00:00Z",
      },
      error: null,
    });
    const assignmentQuery = query({ data: null, error: null });
    const attendanceQuery = query({ data: null, error: null });
    vi.mocked(getSupabase).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(employeeByIdQuery)
        .mockReturnValueOnce(assignmentQuery)
        .mockReturnValueOnce(attendanceQuery),
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(employeeQuery),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
      },
    } as never);

    await expect(createGuardSessionFromAuthToken("token-1")).resolves.toMatchObject({
      employee: { id: "emp-1" },
      assignment: null,
      worksite: null,
      attendance: null,
    });
    expect(employeeQuery.eq).toHaveBeenCalledWith("auth_user_id", "auth-1");
    expect(employeeQuery.eq).toHaveBeenCalledWith("passkey_enabled", true);
  });
});
