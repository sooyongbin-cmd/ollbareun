import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSystemConfigEnabled } from "@/lib/system-configs";
import { GET } from "./route";

vi.mock("@/lib/system-configs", () => ({ isSystemConfigEnabled: vi.fn() }));

describe("notification click policy", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([true, false])("returns only the window policy %s without caching", async (enabled) => {
    vi.mocked(isSystemConfigEnabled).mockResolvedValue(enabled);
    const response = await GET();
    expect(isSystemConfigEnabled).toHaveBeenCalledWith("S000002");
    expect(await response.json()).toEqual({ openInNewWindow: enabled });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
