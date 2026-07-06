import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CloudflareVideoNewPage from "./page";

describe("cloudflare video new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads a selected local video through a Cloudflare direct upload URL", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/education/cloudflare/direct-upload")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({
          fileName: "safety.mp4",
          fileSize: 11,
        });

        return Response.json({
          directUpload: {
            uid: "video-1",
            uploadURL: "https://upload.videodelivery.net/video-1",
            maxUploadBytes: 209715200,
          },
        });
      }

      expect(url).toBe("https://upload.videodelivery.net/video-1");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
      return Response.json({});
    });
    vi.stubGlobal("fetch", fetch);

    render(<CloudflareVideoNewPage />);

    const file = new File(["hello video"], "safety.mp4", { type: "video/mp4" });
    await user.upload(screen.getByLabelText("동영상 파일"), file);
    await user.click(screen.getByRole("button", { name: "업로드" }));

    expect(await screen.findByText("업로드가 완료되었습니다. Cloudflare에서 처리 중일 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("video-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "시청 화면으로 이동" })).toHaveAttribute(
      "href",
      "/manager/safty/cloudflare/watch/video-1",
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
