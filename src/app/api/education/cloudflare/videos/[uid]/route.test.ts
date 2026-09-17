import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCloudflareVideoByUid } from "@/lib/cloudflare-stream";
import { getManagerUser } from "@/lib/manager-auth";
import { GET } from "./route";

vi.mock("@/lib/cloudflare-stream", () => ({
  getCloudflareVideoByUid: vi.fn(),
}));

vi.mock("@/lib/manager-auth", () => ({
  getManagerUser: vi.fn(),
}));

describe("cloudflare video detail route", () => {
  beforeEach(() => {
    vi.mocked(getCloudflareVideoByUid).mockReset();
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
  });

  it("returns one Cloudflare video", async () => {
    vi.mocked(getCloudflareVideoByUid).mockResolvedValue({
      uid: "video-1",
      title: "화재 안전 교육.mp4",
      status: "ready",
      pctComplete: "100",
      uploaded: "2026-06-05T01:00:00.000Z",
      size: 1048576,
      duration: 123,
      readyToStream: true,
    });

    const response = await GET({} as Request, { params: Promise.resolve({ uid: "video-1" }) });

    expect(response.status).toBe(200);
    expect(getCloudflareVideoByUid).toHaveBeenCalledWith("video-1");
    await expect(response.json()).resolves.toEqual({
      video: {
        uid: "video-1",
        title: "화재 안전 교육.mp4",
        status: "ready",
        pctComplete: "100",
        uploaded: "2026-06-05T01:00:00.000Z",
        size: 1048576,
        duration: 123,
        readyToStream: true,
      },
    });
  });
});
