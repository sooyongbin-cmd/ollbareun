import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerLayout from "./layout";

function SuspendedManagerChild() {
  throw new Promise(() => undefined);
}

describe("manager layout loading state", () => {
  it("uses the wider manager content width", () => {
    const { container } = render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    const widerContainers = Array.from(container.querySelectorAll("div")).filter((element) =>
      element.className.includes("max-w-[1180px]"),
    );

    expect(widerContainers).toHaveLength(3);
  });

  it("shows the data lookup message while manager content is suspended", () => {
    render(
      <ManagerLayout>
        <SuspendedManagerChild />
      </ManagerLayout>,
    );

    expect(screen.getByText("자료조회중입니다...")).toBeInTheDocument();
  });

  it("renames the safety education menu and links education resources", () => {
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    // Both mobile and desktop menus contain "안전교육"
    expect(screen.getAllByText("안전교육")[0]).toBeInTheDocument();
    expect(screen.queryByText("안전교육 관리")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "교육자료관리" })[0]).toHaveAttribute(
      "href",
      "/manager/safty/resources",
    );
    expect(screen.getAllByRole("link", { name: "교육이수관리" })[0]).toHaveAttribute(
      "href",
      "/manager/safty/completions",
    );
    expect(screen.queryByText("교육 대상 관리 목록/등록/수정")).not.toBeInTheDocument();
  });

  it("adds system logs to the manager menu", () => {
    render(
      <ManagerLayout>
        <div>관리자 본문</div>
      </ManagerLayout>,
    );

    expect(screen.getAllByText("직원관리")[0]).toBeInTheDocument();
    expect(screen.queryByText("직원 관리")).not.toBeInTheDocument();
    expect(screen.getAllByText("리포트출력")[0]).toBeInTheDocument();
    expect(screen.queryByText("리포트 출력")).not.toBeInTheDocument();
    expect(screen.getAllByText("시스템")[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "로그" })[0]).toHaveAttribute("href", "/manager/system/logs");
  });
});
