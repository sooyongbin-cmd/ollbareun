import { afterEach, describe, expect, it, vi } from "vitest";
import { importHolidays } from "./public-holidays";

describe("public holidays import errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("shows the HTTP status and public data API error details", async () => {
    vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "service-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            response: {
              header: {
                resultCode: "30",
                resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
              },
            },
          },
          { status: 401, statusText: "Unauthorized" },
        ),
      ),
    );

    await expect(importHolidays("2026")).rejects.toThrow(
      "특일정보 API가 HTTP 401 Unauthorized를 반환했습니다. (resultCode: 30, resultMsg: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)",
    );
  });

  it("shows the API result code when the HTTP request itself succeeds", async () => {
    vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "service-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          response: {
            header: {
              resultCode: "31",
              resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
            },
          },
        }),
      ),
    );

    await expect(importHolidays("2026")).rejects.toThrow(
      "특일정보 API가 오류를 반환했습니다. (resultCode: 31, resultMsg: SERVICE_KEY_IS_NOT_REGISTERED_ERROR)",
    );
  });

  it("shows a non-JSON response when the upstream response cannot be parsed", async () => {
    vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "service-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream gateway error", { status: 502, headers: { "content-type": "text/plain" } })),
    );

    await expect(importHolidays("2026")).rejects.toThrow(
      "특일정보 API 응답을 해석하지 못했습니다. (HTTP 502, Content-Type: text/plain). 응답 내용: upstream gateway error",
    );
  });

  it("shows the connection error cause", async () => {
    vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "service-key");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND apis.data.go.kr"); }));

    await expect(importHolidays("2026")).rejects.toThrow(
      "특일정보 API에 연결하지 못했습니다. (원인: Error: getaddrinfo ENOTFOUND apis.data.go.kr).",
    );
  });
});
