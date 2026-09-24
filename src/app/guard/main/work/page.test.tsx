import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import GuardWorkPage from "./page";

describe("guard work page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "emp-1", name: "홍길동", role: "경비원" },
        worksite: { id: "work-1", name: "본사" },
      }),
    );
  });

  it("shows the cleaner-specific NFC title through the main work route", async () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify({
      employee: { id: "emp-1", name: "테스트 근무자", role: "미화원" },
      worksite: { id: "work-1", name: "테스트 근무지" },
    }));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ sites: [], logs: [] })));
    render(<GuardWorkPage />);
    expect(await screen.findByRole("heading", { name: "청소구역(NFC 태깅)" })).toBeInTheDocument();
  });

  it("shows missing assignment guidance and does not load inspection lists without a worksite", () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify({
      employee: { id: "emp-1", name: "테스트 근무자", role: "경비원" },
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<GuardWorkPage />);
    expect(screen.getByText("배정된 근무지 정보가 없습니다.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the Figma checkpoint layout and standardizes every Frame 60 label", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/inspection/sites") {
        return Response.json({
          sites: [
            { id: "site-1", name: "정문", worksite_id: "work-1" },
            { id: "site-2", name: "후문", worksite_id: "work-1" },
            { id: "site-3", name: "주차장", worksite_id: "work-1" },
          ],
        });
      }

      if (url === "/api/inspection/logs?worksiteId=work-1") {
        return Response.json({
          logs: [
            {
              inspection_site_id: "site-1",
              employee_id: "emp-1",
              worksite_id: "work-1",
              inspected_at: new Date().toISOString(),
            },
          ],
        });
      }

      return Response.json({}, { status: 404 });
    }));

    render(<GuardWorkPage />);

    expect(await screen.findByRole("heading", { name: "순찰(NFC 태깅)" })).toBeInTheDocument();
    expect(screen.getByText("1/3완료 (33%)")).toBeInTheDocument();
    expect(screen.getByText("근무지")).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText(/✓ 휴대폰 케이스에 교통카드나 다른 카드가/)).toBeInTheDocument();
    expect(screen.getByText(/있으면 인식이 안 될 수 있습니다\./)).toBeInTheDocument();
    expect(screen.getByText("✓ 화면이 켜진 상태에서 태그에 가까이 대주세요.")).toBeInTheDocument();

    const completedCard = await screen.findByRole("article", { name: "정문 체크 완료" });
    expect(within(completedCard).getByText("체크 완료")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "후문 미완료" })).toBeInTheDocument();
  });
});
