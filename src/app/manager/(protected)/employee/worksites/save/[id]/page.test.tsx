import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorksiteSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("worksite save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    useParams.mockReturnValue({ id: "work-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/worksites/work-1")) {
          return Response.json({
            worksite: {
              id: "work-1",
              name: "본사",
              address: "부산광역시 부산진구 중앙대로 1",
              gps_info: { latitude: 37.5, longitude: 127.0 },
              radius_meters: 100,
            },
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/worksites/work-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            name: "서울 본부",
            address: "서울특별시 중구 세종대로 1",
            gpsInfo: { latitude: 37.45, longitude: 126.97 },
            radiusMeters: "120",
          });
          return Response.json({
            worksite: {
              id: "work-1",
              name: "서울 본부",
              address: "서울특별시 중구 세종대로 1",
              gps_info: { latitude: 37.45, longitude: 126.97 },
              radius_meters: 120,
            },
          });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/worksites/work-1")) {
          return new Response(null, { status: 204 });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves worksite changes and returns to management", async () => {
    const user = userEvent.setup();

    render(<WorksiteSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지 상세" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("본사")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("부산광역시 부산진구 중앙대로 1")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("근무지명"));
    await user.type(screen.getByLabelText("근무지명"), "서울 본부");
    await user.clear(screen.getByLabelText("근무지주소"));
    await user.type(screen.getByLabelText("근무지주소"), "서울특별시 중구 세종대로 1");
    await user.clear(screen.getByLabelText("GPS정보"));
    await user.type(screen.getByLabelText("GPS정보"), "37.45, 126.97");
    await user.clear(screen.getByLabelText("허용반경(m)"));
    await user.type(screen.getByLabelText("허용반경(m)"), "120");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("자료가 저장되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/worksites");
  });

  it("confirms and deletes the worksite", async () => {
    const user = userEvent.setup();

    render(<WorksiteSavePage />);

    expect(await screen.findByRole("heading", { name: "근무지 상세" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("자료를 삭제하시겠습니까?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("자료가 삭제되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/worksites");
  });
});
