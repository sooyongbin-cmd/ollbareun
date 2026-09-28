import { describe, expect, it, vi } from "vitest";
import { loadEmployeeRoles, parseEmployeeRoles } from "./employee-roles";

describe("employee roles", () => {
  it("parses trimmed newline-separated roles and removes duplicates", () => {
    expect(parseEmployeeRoles(" 경비원\r\n미화원\n주차원\n사감\n경비원 ")).toEqual([
      "경비원",
      "미화원",
      "주차원",
      "사감",
    ]);
  });

  it("loads roles from the employees_role system config", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { content: "경비원\n미화원\n주차원\n사감" },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await expect(loadEmployeeRoles({ from } as never)).resolves.toEqual([
      "경비원",
      "미화원",
      "주차원",
      "사감",
    ]);
    expect(from).toHaveBeenCalledWith("system_configs");
    expect(eq).toHaveBeenCalledWith("system_code", "employees_role");
  });
});
