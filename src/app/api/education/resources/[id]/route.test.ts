import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEducationResourceById, updateEducationResource } from "@/lib/education-resources";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GET, PATCH } from "./route";

vi.mock("@/lib/education-resources", () => ({
  getEducationResourceById: vi.fn(),
  updateEducationResource: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("education resource detail route", () => {
  beforeEach(() => {
    vi.mocked(getEducationResourceById).mockReset();
    vi.mocked(updateEducationResource).mockReset();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
  });

  it("gets an education resource", async () => {
    vi.mocked(getEducationResourceById).mockResolvedValue({
      id: "resource-1",
      title: "화재 안전 교육",
      youtube_link: "https://www.youtube.com/watch?v=fireSafety",
      created_at: "2026-05-27T00:00:00.000Z",
    });

    const response = await GET({} as Request, { params: Promise.resolve({ id: "resource-1" }) });

    expect(response.status).toBe(200);
    expect(getEducationResourceById).toHaveBeenCalledWith("resource-1", {});
    await expect(response.json()).resolves.toEqual({
      resource: {
        id: "resource-1",
        title: "화재 안전 교육",
        youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        created_at: "2026-05-27T00:00:00.000Z",
      },
    });
  });

  it("updates an education resource", async () => {
    vi.mocked(updateEducationResource).mockResolvedValue({
      id: "resource-1",
      title: "순찰 안전 교육",
      youtube_link: "https://youtu.be/patrolSafety",
      created_at: "2026-05-27T00:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost/api/education/resources/resource-1", {
        method: "PATCH",
        body: JSON.stringify({
          title: "순찰 안전 교육",
          youtubeLink: "https://youtu.be/patrolSafety",
        }),
      }),
      { params: Promise.resolve({ id: "resource-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateEducationResource).toHaveBeenCalledWith(
      {
        id: "resource-1",
        title: "순찰 안전 교육",
        youtubeLink: "https://youtu.be/patrolSafety",
      },
      {},
    );
    await expect(response.json()).resolves.toEqual({
      resource: {
        id: "resource-1",
        title: "순찰 안전 교육",
        youtube_link: "https://youtu.be/patrolSafety",
        created_at: "2026-05-27T00:00:00.000Z",
      },
    });
  });
});
