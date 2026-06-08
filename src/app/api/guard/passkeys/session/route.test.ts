import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuardSessionFromAuthToken } from "@/lib/guard-passkeys";
import { createGuardSessionLog } from "@/lib/guard-session-logs";
import { POST } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  createGuardSessionFromAuthToken: vi.fn(),
}));

vi.mock("@/lib/guard-session-logs", () => ({
  createGuardSessionLog: vi.fn(),
}));

describe("guard passkey session route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a legacy guard session from an access token", async () => {
    vi.mocked(createGuardSessionFromAuthToken).mockResolvedValue({
      employee: { id: "emp-1", name: "홍길동" },
      assignment: null,
      worksite: null,
      attendance: null,
    } as never);
    vi.mocked(createGuardSessionLog).mockResolvedValue({ id: "log-1" } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/passkeys/session", {
        method: "POST",
        headers: { Authorization: "Bearer token-1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createGuardSessionFromAuthToken).toHaveBeenCalledWith("token-1");
    await expect(response.json()).resolves.toMatchObject({ employee: { id: "emp-1" }, sessionLogId: "log-1" });
  });
});
