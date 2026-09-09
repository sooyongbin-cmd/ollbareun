import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpecialRemarkDetailPage from "./page";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("manager special remark detail page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/inspection/special-remarks/report-1" && init?.method === "DELETE") {
          return Response.json({ success: true });
        }
        if (url === "/api/inspection/special-remarks/report-1") {
          return Response.json({
            report: {
              id: "report-1",
              reported_at: "2026-06-11T00:10:00Z",
              employee_name: "홍길동",
              content: "첫 줄\n두번째 줄 전체 내용",
              photo_url: "https://example.com/photo.jpg",
              email_to: "client@example.com",
              email_status: "sent",
              email_sent_at: "2026-06-11T00:11:00Z",
              email_error: null,
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows full detail and deletes the report after confirmation", async () => {
    const user = userEvent.setup();

    render(<SpecialRemarkDetailPage params={Promise.resolve({ id: "report-1" })} />);

    expect(await screen.findByRole("heading", { name: "특이사항 상세" })).toBeInTheDocument();
    expect(screen.getByText("점검일시")).toBeInTheDocument();
    expect(screen.getByText("점검자")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("보고 위치 (GPS)")).toBeInTheDocument();
    expect(screen.getByText("기록 없음")).toBeInTheDocument();
    expect(screen.getByText(/두번째 줄 전체 내용/)).toBeInTheDocument();
    expect(screen.getByAltText("첨부사진")).toHaveAttribute("src", "https://example.com/photo.jpg");

    expect(screen.getByText("보고서 수신 이메일 주소")).toBeInTheDocument();
    expect(screen.getByText("client@example.com")).toBeInTheDocument();
    expect(screen.getByText("이메일 발송 상태")).toBeInTheDocument();
    expect(screen.getByText("발송 완료")).toBeInTheDocument();
    expect(screen.getByText("이메일 발송 시각")).toBeInTheDocument();
    expect(screen.getByText("2026. 06. 11. 09:11")).toBeInTheDocument();
    expect(screen.getByText("이메일 발송 실패 사유")).toBeInTheDocument();
    expect(screen.getByText("없음")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith("특이사항 보고를 삭제하시겠습니까?");
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/inspection/special-remarks/report-1", { method: "DELETE" });
    });
    expect(push).toHaveBeenCalledWith("/manager/inspection/special-remarks");
  });

  it("shows geocoded address when gps_info is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/inspection/special-remarks/report-2") {
          return Response.json({
            report: {
              id: "report-2",
              reported_at: "2026-06-11T00:10:00Z",
              employee_name: "이순신",
              content: "이상 무",
              photo_url: null,
              gps_info: { latitude: 37.5665, longitude: 126.978 },
              email_to: "manager@example.com",
              email_status: "sent",
              email_sent_at: "2026-06-11T00:10:05Z",
              email_error: null,
            },
          });
        }
        if (url.includes("/api/kakao/reverse-geocode")) {
          return Response.json({
            address: "서울특별시 중구 세종대로 110",
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );

    render(<SpecialRemarkDetailPage params={Promise.resolve({ id: "report-2" })} />);

    expect(await screen.findByText("서울특별시 중구 세종대로 110")).toBeInTheDocument();
    expect(screen.getByText("이순신")).toBeInTheDocument();
    expect(screen.queryByText("기록 없음")).not.toBeInTheDocument();
  });

  it("displays email failure status and error details when email fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/inspection/special-remarks/report-3") {
          return Response.json({
            report: {
              id: "report-3",
              reported_at: "2026-06-11T00:10:00Z",
              employee_name: "강감찬",
              content: "순찰 보고",
              photo_url: null,
              gps_info: null,
              email_to: "fail@example.com",
              email_status: "failed",
              email_sent_at: null,
              email_error: "SMTP connection timeout",
            },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );

    render(<SpecialRemarkDetailPage params={Promise.resolve({ id: "report-3" })} />);

    expect(await screen.findByRole("heading", { name: "특이사항 상세" })).toBeInTheDocument();
    expect(screen.getByText("발송 실패")).toBeInTheDocument();
    expect(screen.getByText("SMTP connection timeout")).toBeInTheDocument();
  });
});
