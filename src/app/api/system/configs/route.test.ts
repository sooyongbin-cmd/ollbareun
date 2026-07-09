import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSystemConfig, listSystemConfigs } from "@/lib/system-configs";
import { getManagerUser } from "@/lib/manager-auth";
import { GET, POST } from "./route";

vi.mock("@/lib/system-configs", () => ({
  createSystemConfig: vi.fn(),
  listSystemConfigs: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("/api/system/configs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("denies GET if not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns system configs", async () => {
    vi.mocked(listSystemConfigs).mockResolvedValue([{ system_code: "manager_email" }] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ configs: [{ system_code: "manager_email" }] });
  });

  it("denies POST if not logged in", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/system/configs", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("creates a system config", async () => {
    vi.mocked(createSystemConfig).mockResolvedValue({ system_code: "manager_email" } as never);

    const response = await POST(
      new Request("http://localhost/api/system/configs", {
        method: "POST",
        body: JSON.stringify({
          systemCode: "manager_email",
          parentSystemCode: "",
          description: "Manager notification email address",
          content: "admin@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createSystemConfig).toHaveBeenCalledWith({
      systemCode: "manager_email",
      parentSystemCode: "",
      description: "Manager notification email address",
      content: "admin@example.com",
    });
  });
});
