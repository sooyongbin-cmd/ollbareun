import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuardPasskeyRequest } from "@/lib/guard-passkeys";
import { POST } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  createGuardPasskeyRequest: vi.fn(),
}));

describe("guard passkey request route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a passkey request for the guard employee", async () => {
    vi.mocked(createGuardPasskeyRequest).mockResolvedValue({ id: "req-1", status: "pending" } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/passkey-requests", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createGuardPasskeyRequest).toHaveBeenCalledWith("emp-1");
    await expect(response.json()).resolves.toMatchObject({ request: { id: "req-1" } });
  });
});
