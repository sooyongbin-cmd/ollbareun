import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCloudflareVideos } from "@/lib/cloudflare-stream";
import { getManagerUser } from "@/lib/manager-auth";
import { GET } from "./route";

vi.mock("@/lib/cloudflare-stream", () => ({
  listCloudflareVideos: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("cloudflare videos route", () => {
  beforeEach(() => {
    vi.mocked(listCloudflareVideos).mockReset();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("lists Cloudflare videos", async () => {
    vi.mocked(listCloudflareVideos).mockResolvedValue([
      {
        uid: "video-1",
        title: "화재 안전 교육.mp4",
        status: "ready",
        pctComplete: "100",
        uploaded: "2026-06-05T01:00:00.000Z",
        size: 1048576,
        duration: 123,
        readyToStream: true,
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      videos: [
        {
          uid: "video-1",
          title: "화재 안전 교육.mp4",
          status: "ready",
          pctComplete: "100",
          uploaded: "2026-06-05T01:00:00.000Z",
          size: 1048576,
          duration: 123,
          readyToStream: true,
        },
      ],
    });
  });

  it("returns a readable Cloudflare error", async () => {
    vi.mocked(listCloudflareVideos).mockRejectedValue(new Error("Cloudflare 환경 변수가 설정되지 않았습니다."));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Cloudflare 환경 변수가 설정되지 않았습니다.",
    });
  });
});
