import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DatabaseIoPage from "./page";

describe("manager database io page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          stats: {
            tables: [
              {
                schemaName: "public",
                tableName: "guard_session_logs",
                blocksRead: 120,
                blocksHit: 880,
                cacheHitRatePercent: 88,
                readRatioPercent: 12,
              },
            ],
            queries: [
              {
                queryId: "query-1",
                calls: 15,
                totalExecTimeMs: 1200,
                meanExecTimeMs: 80,
                sharedBlocksRead: 120,
                sharedBlocksHit: 880,
                tempBlocksRead: 0,
                tempBlocksWritten: 0,
                query: "select * from public.guard_session_logs",
              },
            ],
            queryStatsAvailable: true,
            generatedAt: "2026-09-10T01:00:00.000Z",
          },
        }),
      ),
    );
  });

  it("renders table and query I/O statistics", async () => {
    render(<DatabaseIoPage />);

    expect(await screen.findByRole("heading", { name: "DB I/O" })).toBeInTheDocument();
    expect(await screen.findByText("테이블별 I/O")).toBeInTheDocument();
    expect(screen.getByText("쿼리별 I/O")).toBeInTheDocument();
    expect(screen.getByText("public.guard_session_logs")).toBeInTheDocument();
    expect(screen.getByText("select * from public.guard_session_logs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
  });

  it("shows the unavailable query statistics notice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          stats: {
            tables: [],
            queries: [],
            queryStatsAvailable: false,
            generatedAt: null,
          },
        }),
      ),
    );

    render(<DatabaseIoPage />);

    expect(await screen.findByText("쿼리 통계가 비활성화되어 있습니다.")).toBeInTheDocument();
  });
});
