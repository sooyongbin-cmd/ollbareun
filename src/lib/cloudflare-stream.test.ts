import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCloudflareDirectUpload, listCloudflareVideos, MAX_CLOUDFLARE_UPLOAD_BYTES } from "./cloudflare-stream";

const originalEnv = process.env;

describe("cloudflare stream", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      cloudflare_account_id: "account-1",
      cloudflare_token: "token-1",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("normalizes Cloudflare Stream videos for the manager list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.headers).toEqual({
          Authorization: "Bearer token-1",
        });

        return Response.json({
          success: true,
          result: [
            {
              uid: "video-1",
              meta: { name: "화재 안전 교육.mp4" },
              status: { state: "ready", pctComplete: "100" },
              uploaded: "2026-06-05T01:00:00.000Z",
              size: 1048576,
              duration: 123,
              readyToStream: true,
            },
          ],
        });
      }),
    );

    await expect(listCloudflareVideos()).resolves.toEqual([
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
  });

  it("fails with a readable message when Cloudflare env is missing", async () => {
    process.env = {
      ...originalEnv,
      cloudflare_account_id: "",
      cloudflare_token: "",
    };

    await expect(listCloudflareVideos()).rejects.toThrow("Cloudflare 환경 변수가 설정되지 않았습니다.");
  });

  it("explains Cloudflare Stream authorization failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            success: false,
            errors: [
              {
                message:
                  "Authorization Failure: The authentication credentials are not authorized to perform the request. Verify the credentials and try again.",
              },
            ],
          },
          { status: 403 },
        ),
      ),
    );

    await expect(listCloudflareVideos()).rejects.toThrow(
      "Cloudflare API 토큰에 Stream 권한이 없습니다. Cloudflare 대시보드에서 해당 Account 범위에 Stream Read와 Stream Edit 권한을 추가하세요.",
    );
  });

  it("creates a direct upload URL with a one hour max duration", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ maxDurationSeconds: 3600, meta: { name: "교육.mp4" } }));

      return Response.json({
        success: true,
        result: {
          uid: "video-1",
          uploadURL: "https://upload.videodelivery.net/video-1",
        },
      });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(createCloudflareDirectUpload({ fileName: "교육.mp4", fileSize: 1024 })).resolves.toEqual({
      uid: "video-1",
      uploadURL: "https://upload.videodelivery.net/video-1",
      maxUploadBytes: MAX_CLOUDFLARE_UPLOAD_BYTES,
    });
  });

  it("rejects files over 200MB before calling Cloudflare", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(
      createCloudflareDirectUpload({
        fileName: "too-large.mp4",
        fileSize: MAX_CLOUDFLARE_UPLOAD_BYTES + 1,
      }),
    ).rejects.toThrow("200MB 이하의 동영상 파일만 업로드할 수 있습니다.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
