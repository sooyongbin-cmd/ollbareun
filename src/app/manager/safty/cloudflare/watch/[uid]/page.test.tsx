import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CloudflareVideoWatchPage from "./page";

describe("cloudflare video watch page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
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
        }),
      ),
    );
  });

  it("renders the Cloudflare Stream iframe for the video", async () => {
    render(await CloudflareVideoWatchPage({ params: Promise.resolve({ uid: "video-1" }) }));

    expect(screen.getByRole("heading", { name: "화재 안전 교육.mp4" })).toBeInTheDocument();
    expect(screen.getByTitle("화재 안전 교육.mp4")).toHaveAttribute(
      "src",
      "https://iframe.videodelivery.net/video-1",
    );
  });
});
