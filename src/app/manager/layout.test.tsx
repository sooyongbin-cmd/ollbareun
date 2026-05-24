import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerLayout from "./layout";

function SuspendedManagerChild() {
  throw new Promise(() => undefined);
}

describe("manager layout loading state", () => {
  it("shows the data lookup message while manager content is suspended", () => {
    render(
      <ManagerLayout>
        <SuspendedManagerChild />
      </ManagerLayout>,
    );

    expect(screen.getByText("자료조회중입니다...")).toBeInTheDocument();
  });
});
