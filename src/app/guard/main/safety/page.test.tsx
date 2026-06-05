import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardSafetyEducationPage from "./page";

let completionRows: Array<{
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
  completed_at: string | null;
}> = [];

const fireTitle = "화재 안전 교육";
const patrolTitle = "순찰 안전 교육";

const playerInstances: MockYoutubePlayer[] = [];

class MockYoutubePlayer {
  options: {
    events?: {
      onReady?: (event: { target: MockYoutubePlayer }) => void;
      onPlaybackRateChange?: (event: { data: number; target: MockYoutubePlayer }) => void;
      onStateChange?: (event: { data: number }) => void;
    };
  };

  currentTime = 0;
  duration = 100;
  playbackRate = 1;
  destroy = vi.fn();
  getCurrentTime = vi.fn(() => this.currentTime);
  getDuration = vi.fn(() => this.duration);
  getPlaybackRate = vi.fn(() => this.playbackRate);
  setPlaybackRate = vi.fn((rate: number) => {
    this.playbackRate = rate;
  });
  seekTo = vi.fn((seconds: number) => {
    this.currentTime = seconds;
  });
  playVideo = vi.fn();

  constructor(
    _element: HTMLIFrameElement,
    options: {
      events?: {
        onReady?: (event: { target: MockYoutubePlayer }) => void;
        onPlaybackRateChange?: (event: { data: number; target: MockYoutubePlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) {
    this.options = options;
    playerInstances.push(this);
  }
}

function completionPosts() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([input, init]) => String(input).endsWith("/api/education/completions") && init?.method === "POST");
}

async function loadInitialYoutubeIframe() {
  const iframe = await screen.findByTitle(fireTitle);
  fireEvent.load(iframe);
  await waitFor(() => {
    expect(playerInstances).toHaveLength(1);
  });
  return iframe;
}

describe("guard safety education page", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    playerInstances.length = 0;
    completionRows = [];
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "employee-1" },
      }),
    );
    vi.stubGlobal("YT", {
      Player: MockYoutubePlayer,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith("/api/education/resources")) {
          return Response.json({
            resources: [
              {
                id: "resource-1",
                title: fireTitle,
                youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-2",
                title: patrolTitle,
                youtube_link: "https://youtu.be/patrolSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
            ],
          });
        }

        if (url.endsWith("/api/education/completions")) {
          if (init?.method !== "POST") {
            return Response.json({ completions: completionRows });
          }

          const body = JSON.parse(String(init?.body));
          expect(body).toEqual({
            employeeId: "employee-1",
            resourceId: "resource-1",
          });

          return Response.json({
            completion: {
              employee_id: "employee-1",
              resource_id: "resource-1",
              is_completed: true,
              completed_at: "2026-05-27T09:10:00.000Z",
            },
          });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows only safety education titles in the education list", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: fireTitle })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "제목" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "링크" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "https://www.youtube.com/watch?v=fireSafety" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "https://youtu.be/patrolSafety" })).not.toBeInTheDocument();
    await waitFor(() => {
      const iframeUrl = new URL(screen.getByTitle(fireTitle).getAttribute("src") ?? "");
      expect(`${iframeUrl.origin}${iframeUrl.pathname}`).toBe("https://www.youtube.com/embed/fireSafety");
      expect(iframeUrl.searchParams.get("enablejsapi")).toBe("1");
      expect(iframeUrl.searchParams.get("origin")).toBe(window.location.origin);
    });
  });

  it("removes the video section title and outer padding", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: fireTitle })).toBeInTheDocument();

    const videoSection = screen.getByRole("region", { name: "안전교육 영상" });
    expect(videoSection).toHaveClass("p-0");
    expect(within(videoSection).queryByText(fireTitle)).not.toBeInTheDocument();
  });

  it("changes the iframe when a safety education item is selected", async () => {
    const user = userEvent.setup();

    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: fireTitle })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: patrolTitle }));

    await waitFor(() => {
      const iframeUrl = new URL(screen.getByTitle(patrolTitle).getAttribute("src") ?? "");
      expect(`${iframeUrl.origin}${iframeUrl.pathname}`).toBe("https://www.youtube.com/embed/patrolSafety");
      expect(iframeUrl.searchParams.get("origin")).toBe(window.location.origin);
    });
  });

  it("excludes completed safety education items from the list", async () => {
    completionRows = [
      {
        employee_id: "employee-1",
        resource_id: "resource-1",
        is_completed: true,
        completed_at: "2026-05-27T09:10:00.000Z",
      },
    ];

    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: patrolTitle })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: fireTitle })).not.toBeInTheDocument();
    await waitFor(() => {
      const iframeUrl = new URL(screen.getByTitle(patrolTitle).getAttribute("src") ?? "");
      expect(`${iframeUrl.origin}${iframeUrl.pathname}`).toBe("https://www.youtube.com/embed/patrolSafety");
      expect(iframeUrl.searchParams.get("origin")).toBe(window.location.origin);
    });
  });

  it("waits for the YouTube iframe to load before creating the API player", async () => {
    render(<GuardSafetyEducationPage />);

    const iframe = await screen.findByTitle(fireTitle);
    expect(playerInstances).toHaveLength(0);

    fireEvent.load(iframe);

    await waitFor(() => {
      expect(playerInstances).toHaveLength(1);
    });
  });

  it("forces playback speed back to 1x when the user changes it", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: fireTitle })).toBeInTheDocument();
    await loadInitialYoutubeIframe();

    playerInstances[0].options.events?.onReady?.({ target: playerInstances[0] });
    playerInstances[0].options.events?.onPlaybackRateChange?.({ data: 2, target: playerInstances[0] });

    expect(playerInstances[0].setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it("returns the video to the last valid position when the user skips forward", async () => {
    vi.useFakeTimers();
    render(<GuardSafetyEducationPage />);

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: fireTitle })).toBeInTheDocument();
    });
    fireEvent.load(screen.getByTitle(fireTitle));
    await vi.waitFor(() => expect(playerInstances).toHaveLength(1));

    playerInstances[0].currentTime = 1;
    await vi.advanceTimersByTimeAsync(1000);
    playerInstances[0].currentTime = 2;
    await vi.advanceTimersByTimeAsync(1000);
    playerInstances[0].currentTime = 30;
    await vi.advanceTimersByTimeAsync(1000);

    expect(playerInstances[0].seekTo).toHaveBeenCalledWith(2, true);
    vi.useRealTimers();
  });

  it("does not record completion when the video ends without enough normal watch time", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: fireTitle })).toBeInTheDocument();
    await loadInitialYoutubeIframe();

    playerInstances[0].options.events?.onStateChange?.({ data: 0 });

    expect(completionPosts()).toHaveLength(0);
  });

  it("records completion once after enough 1x watch time and the video ends", async () => {
    vi.useFakeTimers();
    render(<GuardSafetyEducationPage />);

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: fireTitle })).toBeInTheDocument();
    });
    fireEvent.load(screen.getByTitle(fireTitle));
    await vi.waitFor(() => expect(playerInstances).toHaveLength(1));

    for (let second = 1; second <= 95; second += 1) {
      playerInstances[0].currentTime = second;
      await vi.advanceTimersByTimeAsync(1000);
    }

    playerInstances[0].options.events?.onStateChange?.({ data: 0 });
    playerInstances[0].options.events?.onStateChange?.({ data: 0 });

    await vi.waitFor(() => {
      expect(screen.queryByRole("button", { name: fireTitle })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: patrolTitle })).toBeInTheDocument();
    await vi.waitFor(() => {
      expect(completionPosts()).toHaveLength(1);
    });
    vi.useRealTimers();
  });
});
