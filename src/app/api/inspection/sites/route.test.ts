import { beforeEach, describe, expect, it, vi } from "vitest";
import { listInspectionSites } from "@/lib/inspection";
import { getManagerUser } from "@/lib/manager-auth";
import { requireGuardEmployee } from "@/lib/guard-auth-session";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GET } from "./route";

vi.mock("@/lib/inspection", () => ({ listInspectionSites: vi.fn() }));
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn() }));
vi.mock("@/lib/guard-auth-session", () => ({
  requireGuardEmployee: vi.fn(),
  guardAuthErrorStatus: (error: { status?: number }) => error?.status ?? 400,
}));
vi.mock("@/lib/phase1-data", () => ({ loadGuardSessionByEmployeeId: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("GET /api/inspection/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(listInspectionSites).mockResolvedValue([]);
  });

  it("allows a guard to load only assigned-worksite inspection sites", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "employee-1", name: "김바름", role: "경비원", is_retired: false });
    vi.mocked(loadGuardSessionByEmployeeId).mockResolvedValue({
      assignment: { worksite_id: "work-1" },
      worksite: { id: "work-1", name: "삼한" },
    } as never);

    const response = await GET(new Request("http://localhost/api/inspection/sites"));

    expect(response.status).toBe(200);
    expect(listInspectionSites).toHaveBeenCalledWith({ name: "", worksiteId: "work-1" }, {});
  });

  it("rejects a guard requesting a different worksite", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "employee-1", name: "김바름", role: "경비원", is_retired: false });
    vi.mocked(loadGuardSessionByEmployeeId).mockResolvedValue({
      assignment: { worksite_id: "work-1" },
      worksite: { id: "work-1", name: "삼한" },
    } as never);

    const response = await GET(new Request("http://localhost/api/inspection/sites?worksiteId=work-2"));

    expect(response.status).toBe(403);
    expect(listInspectionSites).not.toHaveBeenCalled();
  });

  it("preserves manager access", async () => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);

    const response = await GET(new Request("http://localhost/api/inspection/sites?worksiteId=work-1"));

    expect(response.status).toBe(200);
    expect(listInspectionSites).toHaveBeenCalledWith({ name: "", worksiteId: "work-1", worksiteName: "" }, {});
  });
});
