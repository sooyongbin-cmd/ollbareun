import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemConfigContent } from "./system-configs";
import { DEFAULT_COMPANY_ADDRESS } from "./company-address";
import { getPublicCompanyAddress } from "./public-company-address";

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
});
