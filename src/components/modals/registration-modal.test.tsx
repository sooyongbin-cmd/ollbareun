import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import RegistrationModal, { type RegistrationFormProps } from "./registration-modal";

function Form({ onSaved, onClose }: RegistrationFormProps) {
  return <><input aria-label="자료" defaultValue="입력 유지" />
    <button onClick={() => onSaved?.({ record: { id: "created" } })}>저장확인</button>
    <button onClick={onClose}>닫기</button></>;
}

it("keeps inputs on confirmation, publishes on close once, and clears results for the next opening", async () => {
  const user = userEvent.setup();
  const saved = vi.fn();
  render(<RegistrationModal title="등록화면" form={Form} onSaved={saved}>등록</RegistrationModal>);
  await user.click(screen.getByRole("button", { name: "등록" }));
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByText("저장확인"));
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(within(dialog).getByLabelText("자료")).toHaveValue("입력 유지");
  expect(saved).not.toHaveBeenCalled();
  await user.click(within(dialog).getByText("닫기"));
  expect(saved).toHaveBeenCalledExactlyOnceWith({ record: { id: "created" } });
  await user.click(screen.getByRole("button", { name: "등록" }));
  await user.keyboard("{Escape}");
  expect(saved).toHaveBeenCalledTimes(1);
});

it("publishes successful registrations when closing with Escape", async () => {
  const user = userEvent.setup();
  const saved = vi.fn();
  render(<RegistrationModal title="등록화면" form={Form} onSaved={saved}>등록</RegistrationModal>);
  await user.click(screen.getByText("등록"));
  await user.click(screen.getByText("저장확인"));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(saved).toHaveBeenCalledTimes(1);
});
