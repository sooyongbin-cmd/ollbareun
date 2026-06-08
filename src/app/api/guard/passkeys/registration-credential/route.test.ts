import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuardPasskeyRegistrationCredential } from "@/lib/guard-passkeys";
import { POST } from "./route";

vi.mock("@/lib/guard-passkeys", () => ({
  createGuardPasskeyRegistrationCredential: vi.fn(),
}));

describe("guard passkey registration credential route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a temporary registration credential", async () => {
    vi.mocked(createGuardPasskeyRegistrationCredential).mockResolvedValue({
      email: "guard-emp-1@ollbareun-passkey.local",
      password: "temporary",
    });

    const response = await POST(
      new Request("http://localhost/api/guard/passkeys/registration-credential", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      email: "guard-emp-1@ollbareun-passkey.local",
      password: "temporary",
    });
  });
});
