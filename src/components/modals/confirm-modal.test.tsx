import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import ConfirmModal from "./confirm-modal";

describe("ConfirmModal", () => {
  it("keeps the modal open and announces the loading state", () => {
    render(
      <ConfirmModal
        isOpen
        loading
        loadingLabel="삭제처리중입니다..."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="자료를 삭제하시겠습니까?"
      />,
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("삭제처리중입니다...");
    expect(screen.queryByRole("button", { name: "예" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "아니오" })).not.toBeInTheDocument();
  });

  it("runs the confirmation action when the modal is not loading", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="변경사항을 저장하시겠습니까?"
      />,
    );

    await user.click(screen.getByRole("button", { name: "예" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("keeps the same modal visible after confirmation starts an async action", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [loading, setLoading] = useState(false);

      return (
        <ConfirmModal
          isOpen
          loading={loading}
          loadingLabel="저장처리중입니다..."
          onClose={() => undefined}
          onConfirm={() => setLoading(true)}
          title="변경사항을 저장하시겠습니까?"
        />
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("저장처리중입니다...");
  });
});
