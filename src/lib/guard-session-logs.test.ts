import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGuardSessionLog,
  listGuardSessionLogs,
  updateGuardSessionLogoutLog,
  updateGuardSessionMainPushLog,
} from "./guard-session-logs";
import { getSupabase } from "./supabase";

vi.mock("./supabase", () => ({
  getSupabase: vi.fn(),
}));

describe("guard session logs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a successful login log", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "log-1", guard_name: "홍길동", login_status: "success" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      createGuardSessionLog({ employeeId: "emp-1", guardName: "홍길동", loginStatus: "success" }),
    ).resolves.toMatchObject({ id: "log-1" });

    expect(supabase.from).toHaveBeenCalledWith("guard_session_logs");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: "emp-1",
        guard_name: "홍길동",
        login_status: "success",
        login_error: null,
      }),
    );
  });

  it("updates the main push result", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "log-1", main_push_status: "success" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await updateGuardSessionMainPushLog({
      id: "log-1",
      status: "success",
      result: { title: "푸시 알림 연결 완료" },
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        main_push_status: "success",
        main_push_result: { title: "푸시 알림 연결 완료" },
      }),
    );
    expect(eq).toHaveBeenCalledWith("id", "log-1");
  });

  it("updates the logout push result", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "log-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await updateGuardSessionLogoutLog({
      id: "log-1",
      browserPushStatus: "removed",
      serverPushStatus: "removed",
      sessionStatus: "removed",
      result: { browserSubscription: "removed" },
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        logout_browser_push_status: "removed",
        logout_server_push_status: "removed",
        logout_session_status: "removed",
        logout_push_result: { browserSubscription: "removed" },
      }),
    );
  });

  it("lists recent logs with filters", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => resolve({ data: [{ id: "log-1" }], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(query) };
    vi.mocked(getSupabase).mockReturnValue(supabase as never);

    await expect(
      listGuardSessionLogs({ guardName: "홍", loginStatus: "success", pushStatus: "error" }),
    ).resolves.toEqual([{ id: "log-1" }]);

    expect(query.order).toHaveBeenCalledWith("login_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(100);
    expect(query.ilike).toHaveBeenCalledWith("guard_name", "%홍%");
    expect(query.eq).toHaveBeenCalledWith("login_status", "success");
    expect(query.eq).toHaveBeenCalledWith("main_push_status", "error");
  });
});
