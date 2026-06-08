import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeGuardPasskeyRegistration } from "@/lib/guard-passkeys";
import { POST } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  completeGuardPasskeyRegistration: vi.fn(),
}));

describe("guard passkey complete route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("marks registration complete", async () => {
    vi.mocked(completeGuardPasskeyRegistration).mockResolvedValue({ id: "req-1", status: "registered" } as never);

    const response = await POST(
      new Request("http://localhost/api/guard/passkeys/complete", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(completeGuardPasskeyRegistration).toHaveBeenCalledWith("emp-1");
  });
});
