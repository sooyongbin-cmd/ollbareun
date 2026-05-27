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
});
