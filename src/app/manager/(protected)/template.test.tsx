import { describe, expect, it, vi } from "vitest";
import { requireManagerUser } from "@/lib/manager-auth";
import ManagerProtectedTemplate from "./template";

vi.mock("@/lib/manager-auth", () => ({
  requireManagerUser: vi.fn().mockResolvedValue({ id: "manager-user" }),
}));

describe("manager protected template", () => {
  it("requires an authenticated manager before rendering protected content", async () => {
    const children = <div>관리자 본문</div>;

    await expect(ManagerProtectedTemplate({ children })).resolves.toBe(children);
    expect(requireManagerUser).toHaveBeenCalledOnce();
  });
});
