import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";
import { deleteInspectionSite, getInspectionSiteById, updateInspectionSite } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

vi.mock("@/lib/inspection", () => ({
  deleteInspectionSite: vi.fn(),
  getInspectionSiteById: vi.fn(),
  updateInspectionSite: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const context = { params: Promise.resolve({ id: "site-1" }) };

describe("/api/inspection/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
  });

  it("returns an inspection site", async () => {
    vi.mocked(getInspectionSiteById).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "Worksite",
      name: "Gate",
      address: "Seoul",
      gps_info: { latitude: 37.5, longitude: 127 },
    });

    const response = await GET(new Request("http://localhost/api/inspection/sites/site-1"), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.site).toMatchObject({ id: "site-1", name: "Gate" });
    expect(getInspectionSiteById).toHaveBeenCalledWith("site-1", {});
  });

  it("updates an inspection site", async () => {
    vi.mocked(updateInspectionSite).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "Worksite",
      name: "Gate",
      address: "Seoul",
      gps_info: { latitude: 37.5, longitude: 127 },
    });

    const body = {
      worksiteId: "work-1",
      name: "Gate",
      address: "Seoul",
      gpsInfo: { latitude: 37.5, longitude: 127 },
    };
    const response = await PATCH(
      new Request("http://localhost/api/inspection/sites/site-1", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      context,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.site).toMatchObject({ id: "site-1", name: "Gate" });
    expect(updateInspectionSite).toHaveBeenCalledWith({ id: "site-1", ...body }, {});
  });

  it("deletes an inspection site", async () => {
    vi.mocked(deleteInspectionSite).mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/inspection/sites/site-1"), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(deleteInspectionSite).toHaveBeenCalledWith("site-1", {});
  });
});
