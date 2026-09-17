import { describe, expect, it, vi } from "vitest";

import { isSystemConfigEnabled } from "@/lib/system-configs";
import { GET } from "./route";

vi.mock("@/lib/system-configs", () => ({
  isSystemConfigEnabled: vi.fn(),
}));

describe("GET /api/guard/configs/special_001", () => {
  it("returns whether continuous speech recognition is enabled", async () => {
    vi.mocked(isSystemConfigEnabled).mockResolvedValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ enabled: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(isSystemConfigEnabled).toHaveBeenCalledWith("special_001");
  });
});
