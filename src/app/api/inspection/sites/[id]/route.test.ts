import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";
import { deleteInspectionSite, getInspectionSiteById, updateInspectionSite } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

vi.mock("@/lib/inspection", () => ({
  deleteInspectionSite: vi.fn(),
  getInspectionSiteById: vi.fn(),
  updateInspectionSite: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/guard-auth-session", () => ({
  requireGuardEmployee: vi.fn(),
  guardAuthErrorStatus: (error: { status?: number }) => error?.status ?? 400,
}));

vi.mock("@/lib/phase1-data", () => ({ loadGuardSessionByEmployeeId: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const context = { params: Promise.resolve({ id: "site-1" }) };

describe("/api/inspection/sites/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "employee-1", name: "김바름", role: "경비원", is_retired: false });
    vi.mocked(loadGuardSessionByEmployeeId).mockResolvedValue({ assignment: { worksite_id: "work-1" }, worksite: { id: "work-1", name: "삼한" } } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
  });

  it("returns an inspection site", async () => {
    vi.mocked(getInspectionSiteById).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "Worksite",
      sort_order: 1,
      name: "Gate",
    });

    const response = await GET(new Request("http://localhost/api/inspection/sites/site-1"), context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.site).toMatchObject({ id: "site-1", name: "Gate" });
    expect(getInspectionSiteById).toHaveBeenCalledWith("site-1", {});
  });

  it("allows a guard to fetch a site at their assigned worksite", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    vi.mocked(getInspectionSiteById).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "삼한",
      sort_order: 1,
      name: "sam1",
    });

    const response = await GET(
      new Request("http://localhost/api/inspection/sites/site-1", { headers: { Cookie: "ollbareum_guard_session=test" } }),
      context,
    );

    expect(response.status).toBe(200);
    expect(requireGuardEmployee).toHaveBeenCalled();
    expect(getInspectionSiteById).toHaveBeenCalledWith("site-1", {});
  });

  it("rejects a guard fetching a site at another worksite", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    vi.mocked(getInspectionSiteById).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-2",
      worksite_name: "다른 근무지",
      sort_order: 1,
      name: "other",
    });

    const response = await GET(
      new Request("http://localhost/api/inspection/sites/site-1", { headers: { Cookie: "ollbareum_guard_session=test" } }),
      context,
    );

    expect(response.status).toBe(403);
  });

  it("updates an inspection site", async () => {
    vi.mocked(updateInspectionSite).mockResolvedValue({
      id: "site-1",
      worksite_id: "work-1",
      worksite_name: "Worksite",
      sort_order: 1,
      name: "Gate",
    });

    const body = {
      worksiteId: "work-1",
      sortOrder: 1,
      name: "Gate",
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
