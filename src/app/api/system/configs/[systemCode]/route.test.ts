import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSystemConfig, getSystemConfig, updateSystemConfig } from "@/lib/system-configs";
import { getManagerUser } from "@/lib/manager-auth";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/system-configs", () => ({
  getSystemConfig: vi.fn(),
  updateSystemConfig: vi.fn(),
  deleteSystemConfig: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("/api/system/configs/[systemCode]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET without requiring manager auth", async () => {
    vi.mocked(getSystemConfig).mockResolvedValue({
      system_code: "USE_QR_CODE",
      parent_system_code: null,
      description: "Use QR Code",
      content: "Y",
    });

    const response = await GET(new Request("http://localhost/api/system/configs/USE_QR_CODE"), {
      params: Promise.resolve({ systemCode: "USE_QR_CODE" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      config: {
        system_code: "USE_QR_CODE",
        parent_system_code: null,
        description: "Use QR Code",
        content: "Y",
      },
    });
  });

  it("denies PATCH if not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/system/configs/USE_QR_CODE", {
        method: "PATCH",
        body: JSON.stringify({ content: "Y" }),
      }),
      { params: Promise.resolve({ systemCode: "USE_QR_CODE" }) },
    );

    expect(response.status).toBe(401);
  });

  it("updates system config on PATCH when authenticated", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(updateSystemConfig).mockResolvedValue({
      system_code: "USE_QR_CODE",
      parent_system_code: null,
      description: null,
      content: "Y",
    });

    const response = await PATCH(
      new Request("http://localhost/api/system/configs/USE_QR_CODE", {
        method: "PATCH",
        body: JSON.stringify({ content: "Y" }),
      }),
      { params: Promise.resolve({ systemCode: "USE_QR_CODE" }) },
    );

    expect(response.status).toBe(200);
    expect(updateSystemConfig).toHaveBeenCalledWith({
      systemCode: "USE_QR_CODE",
      parentSystemCode: undefined,
      description: undefined,
      content: "Y",
    });
  });

  it("denies DELETE if not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/system/configs/USE_QR_CODE"), {
      params: Promise.resolve({ systemCode: "USE_QR_CODE" }),
    });

    expect(response.status).toBe(401);
  });

  it("deletes system config on DELETE when authenticated", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);

    const response = await DELETE(new Request("http://localhost/api/system/configs/USE_QR_CODE"), {
      params: Promise.resolve({ systemCode: "USE_QR_CODE" }),
    });

    expect(response.status).toBe(200);
    expect(deleteSystemConfig).toHaveBeenCalledWith("USE_QR_CODE");
  });
});
