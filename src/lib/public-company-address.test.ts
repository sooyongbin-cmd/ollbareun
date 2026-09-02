import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSystemConfigContent } from "./system-configs";
import { DEFAULT_COMPANY_ADDRESS, DEFAULT_COMPANY_MAP_COORDINATES } from "./company-address";
import { getPublicCompanyAddress, getPublicMapCoordinates } from "./public-company-address";

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

  it("loads map coordinates from code_map_address", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("35.167263, 128.958297");

    await expect(getPublicMapCoordinates()).resolves.toEqual({
      latitude: 35.167263,
      longitude: 128.958297,
    });
    expect(getSystemConfigContent).toHaveBeenCalledWith("code_map_address");
  });

  it("uses the default map coordinates when the map setting cannot be loaded", async () => {
    vi.mocked(getSystemConfigContent).mockRejectedValue(new Error("unavailable"));

    await expect(getPublicMapCoordinates()).resolves.toEqual(DEFAULT_COMPANY_MAP_COORDINATES);
  });
});
