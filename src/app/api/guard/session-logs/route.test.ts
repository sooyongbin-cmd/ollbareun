import { beforeEach, describe, expect, it, vi } from "vitest";
import { listGuardSessionLogs } from "@/lib/guard-session-logs";
import { GET } from "./route";

vi.mock("@/lib/guard-session-logs", () => ({
  listGuardSessionLogs: vi.fn(),
}));

describe("guard session logs route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists logs with filters", async () => {
    vi.mocked(listGuardSessionLogs).mockResolvedValue([{ id: "log-1", guard_name: "홍길동" }] as never);

    const response = await GET(
      new Request("http://localhost/api/guard/session-logs?guardName=홍&loginStatus=success&pushStatus=error"),
    );

    expect(listGuardSessionLogs).toHaveBeenCalledWith({
      guardName: "홍",
      loginStatus: "success",
      pushStatus: "error",
      limit: 100,
    });
    await expect(response.json()).resolves.toEqual({ logs: [{ id: "log-1", guard_name: "홍길동" }] });
  });
});
