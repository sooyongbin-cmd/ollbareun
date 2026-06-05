import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCloudflareDirectUpload, MAX_CLOUDFLARE_UPLOAD_BYTES } from "@/lib/cloudflare-stream";
import { POST } from "./route";

vi.mock("@/lib/cloudflare-stream", () => ({
  MAX_CLOUDFLARE_UPLOAD_BYTES: 209715200,
  createCloudflareDirectUpload: vi.fn(),
}));

describe("cloudflare direct upload route", () => {
  beforeEach(() => {
    vi.mocked(createCloudflareDirectUpload).mockReset();
  });

  it("creates a direct upload URL", async () => {
    vi.mocked(createCloudflareDirectUpload).mockResolvedValue({
      uid: "video-1",
      uploadURL: "https://upload.videodelivery.net/video-1",
      maxUploadBytes: MAX_CLOUDFLARE_UPLOAD_BYTES,
    });

    const response = await POST(
      new Request("http://localhost/api/education/cloudflare/direct-upload", {
        method: "POST",
        body: JSON.stringify({ fileName: "교육.mp4", fileSize: 1024 }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createCloudflareDirectUpload).toHaveBeenCalledWith({ fileName: "교육.mp4", fileSize: 1024 });
    await expect(response.json()).resolves.toEqual({
      directUpload: {
        uid: "video-1",
        uploadURL: "https://upload.videodelivery.net/video-1",
        maxUploadBytes: MAX_CLOUDFLARE_UPLOAD_BYTES,
      },
    });
  });

  it("rejects files over 200MB", async () => {
    vi.mocked(createCloudflareDirectUpload).mockRejectedValue(
      new Error("200MB 이하의 동영상 파일만 업로드할 수 있습니다."),
    );

    const response = await POST(
      new Request("http://localhost/api/education/cloudflare/direct-upload", {
        method: "POST",
        body: JSON.stringify({ fileName: "too-large.mp4", fileSize: MAX_CLOUDFLARE_UPLOAD_BYTES + 1 }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "200MB 이하의 동영상 파일만 업로드할 수 있습니다.",
    });
  });
});
