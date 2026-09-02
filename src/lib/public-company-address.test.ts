import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemConfigContent } from "./system-configs";
import { DEFAULT_COMPANY_ADDRESS } from "./company-address";
import { getPublicCompanyAddress, getPublicMapAddress } from "./public-company-address";

vi.mock("./system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

describe("getPublicCompanyAddress", () => {
  beforeEach(() => {
    vi.mocked(getSystemConfigContent).mockReset();
  });

  it("loads the company address from code_address", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("  부산광역시 강서구 새 주소  ");

    await expect(getPublicCompanyAddress()).resolves.toBe("부산광역시 강서구 새 주소");
    expect(getSystemConfigContent).toHaveBeenCalledWith("code_address");
  });

  it("uses the fallback address when the setting cannot be loaded", async () => {
    vi.mocked(getSystemConfigContent).mockRejectedValue(new Error("unavailable"));

    await expect(getPublicCompanyAddress()).resolves.toBe(DEFAULT_COMPANY_ADDRESS);
  });

  it("loads the map address from code_map_address", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("부산광역시 강서구 지도용 주소");

    await expect(getPublicMapAddress()).resolves.toBe("부산광역시 강서구 지도용 주소");
    expect(getSystemConfigContent).toHaveBeenCalledWith("code_map_address");
  });

  it("uses the company address as the map fallback when the map setting cannot be loaded", async () => {
    vi.mocked(getSystemConfigContent).mockRejectedValue(new Error("unavailable"));

    await expect(getPublicMapAddress("부산광역시 강서구 표시용 주소")).resolves.toBe(
      "부산광역시 강서구 표시용 주소",
    );
  });
});
