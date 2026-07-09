import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSystemConfigContent } from "./system-configs";
import { sendAdminPreRegistrationEmail, sendAdminActivationEmail } from "./manager-security-email";

vi.mock("./system-configs", () => ({
  getSystemConfigContent: vi.fn(),
}));

describe("manager-security-email", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
    vi.stubEnv("NAVER_SMTP_USER", "");
    vi.stubEnv("NAVER_SMTP_PASSWORD", "");
  });

  it("attempts to send pre-registration email", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("receiver@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAdminPreRegistrationEmail("new@example.com")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("attempts to send activation email", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("receiver@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAdminActivationEmail("new@example.com")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("logs warning if manager_email is empty", async () => {
    vi.mocked(getSystemConfigContent).mockResolvedValue("");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(sendAdminPreRegistrationEmail("new@example.com")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("manager_email 설정이 비어있어"));
  });
});
