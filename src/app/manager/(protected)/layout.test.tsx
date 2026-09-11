import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "./layout";
import { PasskeyFeatureProvider } from "@/components/passkey-feature-provider";

const navigationMock = vi.hoisted(() => ({ pathname: "/manager" }));
const authMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(async () => ({ data: { user: { email: "admin@ollbareun.test" } }, error: null })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

vi.mock("@/lib/supabase-browser", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: authMocks.signOut,
      getUser: authMocks.getUser,
    },
  }),
}));

function SuspendedManagerChild() {
  throw new Promise(() => undefined);
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
}

async function waitForMobileSidebar() {
  await waitFor(() => {
    expect(document.querySelector('[data-slot="sidebar"][data-state]')).not.toBeInTheDocument();
  });
}

describe("manager layout", () => {
  beforeEach(() => {
    navigationMock.pathname = "/manager";
    authMocks.replace.mockReset();
    authMocks.signOut.mockReset();
    authMocks.getUser.mockClear();
    setViewportWidth(1024);
    document.cookie = "sb-test-auth-token=; Max-Age=0; path=/";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        assign: authMocks.replace,
      },
      writable: true,
    });
  });

  it("collapses the desktop sidebar and exposes icon tooltips", async () => {
    const user = userEvent.setup();
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    const desktopSidebar = document.querySelector('[data-slot="sidebar"][data-state="expanded"]');
    expect(desktopSidebar).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "관리자 메뉴 열기 또는 접기" }));

    expect(document.querySelector('[data-slot="sidebar"][data-state="collapsed"]')).toBeInTheDocument();

    await user.hover(screen.getByRole("link", { name: "대시보드" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("대시보드");
  });

  it("opens and closes the mobile manager sheet", async () => {
    const user = userEvent.setup();
    setViewportWidth(375);
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );
    await waitForMobileSidebar();

    await user.click(screen.getByRole("button", { name: "관리자 메뉴 열기 또는 접기" }));

    const dialog = await screen.findByRole("dialog", { name: "관리자 메뉴" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "교육자료관리" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog", { name: "관리자 메뉴" })).not.toBeInTheDocument();
  });

  it("locks scrolling and closes the mobile sheet with Escape", async () => {
    const user = userEvent.setup();
    setViewportWidth(375);
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );
    await waitForMobileSidebar();

    await user.click(screen.getByRole("button", { name: "관리자 메뉴 열기 또는 접기" }));
    await screen.findByRole("dialog", { name: "관리자 메뉴" });

    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "관리자 메뉴" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile sheet after selecting a navigation link", async () => {
    const user = userEvent.setup();
    setViewportWidth(375);
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );
    await waitForMobileSidebar();

    await user.click(screen.getByRole("button", { name: "관리자 메뉴 열기 또는 접기" }));
    const dialog = await screen.findByRole("dialog", { name: "관리자 메뉴" });
    const link = within(dialog).getByRole("link", { name: "교육자료관리" });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);

    expect(screen.queryByRole("dialog", { name: "관리자 메뉴" })).not.toBeInTheDocument();
  });

  it("renders the full-width inset content container", () => {
    const { container } = render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    const content = container.querySelector("section.max-w-\\[100rem\\]");
    expect(content).toHaveClass("w-full", "min-w-0", "p-4", "md:p-6", "lg:p-8");
  });

  it("shows the existing loading board while manager content is suspended", () => {
    render(
      <ManagerLayout>
        <SuspendedManagerChild />
      </ManagerLayout>,
    );

    expect(screen.getByRole("status", { name: "자료를 불러오는 중입니다." })).toBeInTheDocument();
  });

  it("keeps the persisted manager session after the browser is reopened", async () => {
    document.cookie = "sb-test-auth-token=value; path=/";

    render(
      <ManagerLayout>
        <div>manager body</div>
      </ManagerLayout>,
    );

    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(authMocks.replace).not.toHaveBeenCalled();
  });

  it("signs out only when the manager selects logout", async () => {
    const user = userEvent.setup();
    render(
      <ManagerLayout>
        <div>manager body</div>
      </ManagerLayout>,
    );

    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(authMocks.signOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(authMocks.replace).toHaveBeenCalledWith("/manager/auth"));
  });

  it("keeps all manager navigation groups and destinations", () => {
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    expect(screen.getByRole("link", { name: "직원관리" })).toHaveAttribute("href", "/manager/employee/employees");
    expect(screen.getByText("현장점검")).toBeInTheDocument();
    expect(screen.getByText("안전교육")).toBeInTheDocument();
    expect(screen.getByText("리포트출력")).toBeInTheDocument();
    expect(screen.getByText("시스템")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/manager");
    expect(screen.getByRole("link", { name: "교육자료관리" })).toHaveAttribute(
      "href",
      "/manager/safety/resources",
    );
    expect(screen.getByRole("link", { name: "교육이수관리" })).toHaveAttribute(
      "href",
      "/manager/safety/completions",
    );
    expect(screen.getByRole("link", { name: "자동알림이력" })).toHaveAttribute(
      "href",
      "/manager/safety/notifications",
    );
    expect(screen.getByRole("link", { name: "로그현황" })).toHaveAttribute(
      "href",
      "/manager/system/logs",
    );
    expect(screen.getByRole("link", { name: "DB I/O" })).toHaveAttribute(
      "href",
      "/manager/system/db-io",
    );
    expect(screen.getByRole("link", { name: "시스템설정" })).toHaveAttribute(
      "href",
      "/manager/system/configs",
    );
    expect(screen.getByRole("link", { name: "프로젝트 문서" })).toHaveAttribute(
      "href",
      "https://ollbareun.vercel.app/docs/documents/",
    );

    const systemLinks = screen
      .getByText("시스템")
      .closest("[data-sidebar=group]")
      ?.querySelectorAll("a");
    expect(Array.from(systemLinks ?? []).map((link) => link.textContent?.trim())).toEqual([
      "로그현황",
      "패스키 요청 관리",
      "관리자관리",
      "프로젝트 문서",
      "DB I/O",
      "시스템설정",
    ]);
  });

  it("hides passkey request navigation when the feature is disabled", () => {
    render(
      <PasskeyFeatureProvider enabled={false}>
        <ManagerLayout>
          <div>관리자 본문</div>
        </ManagerLayout>
      </PasskeyFeatureProvider>,
    );

    expect(screen.queryByRole("link", { name: "패스키 요청 관리" })).not.toBeInTheDocument();
  });

  it("marks the current route active and shows its breadcrumb", () => {
    navigationMock.pathname = "/manager/inspection/logs";

    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    expect(screen.getByRole("link", { name: "현장점검현황" })).toHaveAttribute("data-active", "true");
    const breadcrumb = screen.getByRole("navigation", { name: "현재 위치" });
    expect(within(breadcrumb).getByText("현장점검")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("현장점검현황")).toBeInTheDocument();
  });

  it("shows the signed-in manager email in the header", async () => {
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    expect(await screen.findByText("admin@ollbareun.test")).toBeInTheDocument();
  });

  it("renders the PWA installation banner on beforeinstallprompt", () => {
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    const installEvent = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = vi.fn();
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });
    installEvent.preventDefault = vi.fn();

    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.getByRole("dialog", { name: "올바름 관리자 설치" })).toBeInTheDocument();
  });
});
