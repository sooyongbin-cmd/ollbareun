import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEducationResource, listEducationResources } from "@/lib/education-resources";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GET, POST } from "./route";

vi.mock("@/lib/education-resources", () => ({
  createEducationResource: vi.fn(),
  listEducationResources: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe("education resources route", () => {
  beforeEach(() => {
    vi.mocked(createEducationResource).mockReset();
    vi.mocked(listEducationResources).mockReset();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
  });

  it("lists education resources", async () => {
    vi.mocked(listEducationResources).mockResolvedValue([
      {
        id: "resource-1",
        title: "화재 안전 교육",
        youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        created_at: "2026-05-27T00:00:00.000Z",
      },
    ]);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      resources: [
        {
          id: "resource-1",
          title: "화재 안전 교육",
          youtube_link: "https://www.youtube.com/watch?v=fireSafety",
          created_at: "2026-05-27T00:00:00.000Z",
        },
      ],
    });
  });

  it("creates an education resource from a YouTube link", async () => {
    vi.mocked(createEducationResource).mockResolvedValue({
      id: "resource-1",
      title: "화재 안전 교육",
      youtube_link: "https://www.youtube.com/watch?v=fireSafety",
      created_at: "2026-05-27T00:00:00.000Z",
    });
    const body = new FormData();
    body.set("title", "화재 안전 교육");
    body.set("youtubeLink", "https://www.youtube.com/watch?v=fireSafety");

    const response = await POST({ formData: async () => body } as Request);

    expect(response.status).toBe(200);
    expect(createEducationResource).toHaveBeenCalledWith(
      {
        title: "화재 안전 교육",
        youtubeLink: "https://www.youtube.com/watch?v=fireSafety",
      },
      {},
    );
    await expect(response.json()).resolves.toEqual({
      resource: {
        id: "resource-1",
        title: "화재 안전 교육",
        youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        created_at: "2026-05-27T00:00:00.000Z",
      },
    });
  });

  it("returns a readable timeout error when Supabase does not respond", async () => {
    vi.mocked(createEducationResource).mockRejectedValue(new DOMException("This operation was aborted", "AbortError"));
    const body = new FormData();
    body.set("title", "화재 안전 교육");
    body.set("youtubeLink", "https://www.youtube.com/watch?v=fireSafety");

    const response = await POST({ formData: async () => body } as Request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Supabase 응답 시간이 초과되었습니다. 네트워크 상태와 테이블 생성 여부를 확인하세요.",
    });
  });
});
