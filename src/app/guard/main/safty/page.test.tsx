import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardSafetyEducationPage from "./page";

let completionRows: Array<{
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
  completed_at: string | null;
}> = [];

const playerInstances: Array<{
  options: {
    events?: {
      onStateChange?: (event: { data: number }) => void;
    };
  };
  destroy: ReturnType<typeof vi.fn>;
}> = [];

class MockYoutubePlayer {
  options: {
    events?: {
      onStateChange?: (event: { data: number }) => void;
    };
  };

  destroy = vi.fn();

  constructor(_element: HTMLIFrameElement, options: { events?: { onStateChange?: (event: { data: number }) => void } }) {
    this.options = options;
    playerInstances.push(this);
  }
}

describe("guard safety education page", () => {
  beforeEach(() => {
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
                title: "화재 안전 교육",
                youtube_link: "https://www.youtube.com/watch?v=fireSafety",
                created_at: "2026-05-27T00:00:00.000Z",
              },
              {
                id: "resource-2",
                title: "순찰 안전 교육",
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

  it("shows safety education titles and links", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("heading", { name: "안전교육" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "안전교육 목록" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "안전교육 영상" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "제목" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "링크" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "화재 안전 교육" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "https://www.youtube.com/watch?v=fireSafety" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle("화재 안전 교육")).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/fireSafety?enablejsapi=1&playsinline=1&rel=0",
      );
    });
  });

  it("changes the iframe when a safety education item is selected", async () => {
    const user = userEvent.setup();

    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: "화재 안전 교육" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "https://youtu.be/patrolSafety" }));

    await waitFor(() => {
      expect(screen.getByTitle("순찰 안전 교육")).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/patrolSafety?enablejsapi=1&playsinline=1&rel=0",
      );
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

    expect(await screen.findByRole("button", { name: "순찰 안전 교육" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "화재 안전 교육" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle("순찰 안전 교육")).toHaveAttribute(
        "src",
        "https://www.youtube.com/embed/patrolSafety?enablejsapi=1&playsinline=1&rel=0",
      );
    });
  });

  it("records completion when the video ends", async () => {
    render(<GuardSafetyEducationPage />);

    expect(await screen.findByRole("button", { name: "화재 안전 교육" })).toBeInTheDocument();
    await waitFor(() => {
      expect(playerInstances).toHaveLength(1);
    });

    playerInstances[0].options.events?.onStateChange?.({ data: 0 });

    await waitFor(() => {
      expect(screen.getByText("교육이수 처리가 완료되었습니다.")).toBeInTheDocument();
    });

    playerInstances[0].options.events?.onStateChange?.({ data: 0 });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "화재 안전 교육" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "순찰 안전 교육" })).toBeInTheDocument();

    const completionPosts = vi
      .mocked(fetch)
      .mock.calls.filter(([input, init]) => String(input).endsWith("/api/education/completions") && init?.method === "POST");
    expect(completionPosts).toHaveLength(1);
  });
});
