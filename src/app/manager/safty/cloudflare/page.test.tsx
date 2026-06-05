import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CloudflareVideosPage from "./page";

describe("cloudflare videos page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
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
            {
              uid: "video-2",
              title: "감전 예방 교육.mp4",
              status: "inprogress",
              pctComplete: "45",
              uploaded: "2026-06-05T02:00:00.000Z",
              size: 2097152,
              duration: null,
              readyToStream: false,
            },
          ],
        }),
      ),
    );
  });

  it("renders a searchable Cloudflare video list", async () => {
    const user = userEvent.setup();

    render(<CloudflareVideosPage />);

    expect(await screen.findByRole("heading", { name: "교육자료(cloudflare)목록" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "등록" })).toHaveAttribute("href", "/manager/safty/cloudflare/new");
    expect(screen.getByRole("columnheader", { name: "제목/UID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "상태" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "업로드일" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "크기" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "시청" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "화재 안전 교육.mp4" })).toHaveAttribute(
      "href",
      "/manager/safty/cloudflare/watch/video-1",
    );
    expect(screen.getAllByRole("link", { name: "시청" })[0]).toHaveAttribute(
      "href",
      "/manager/safty/cloudflare/watch/video-1",
    );

    await user.type(screen.getByLabelText("제목 또는 UID"), "감전");
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("감전 예방 교육.mp4")).toBeInTheDocument();
    expect(screen.queryByText("화재 안전 교육.mp4")).not.toBeInTheDocument();
  });
});
