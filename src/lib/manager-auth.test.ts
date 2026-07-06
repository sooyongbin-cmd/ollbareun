import { describe, expect, it } from "vitest";
import { createManagerAuthRedirectUrl, getManagerUser } from "./manager-auth";

describe("manager auth helpers", () => {
  it("builds the manager auth URL with a safe relative next path", () => {
    expect(createManagerAuthRedirectUrl("/manager/employee/employees")).toBe(
      "/manager/auth?next=%2Fmanager%2Femployee%2Femployees",
    );
  });

  it("falls back to the manager dashboard when next path is not a manager path", () => {
    expect(createManagerAuthRedirectUrl("https://example.com/phishing")).toBe("/manager/auth?next=%2Fmanager");
    expect(createManagerAuthRedirectUrl("/managerx")).toBe("/manager/auth?next=%2Fmanager");
  });

  it("returns the authenticated manager user from Supabase", async () => {
    const user = { id: "user-1", app_metadata: { provider: "email" } };
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    };

    await expect(getManagerUser(supabase)).resolves.toEqual(user);
  });

  it("returns null when Supabase has no authenticated manager user", async () => {
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error("missing session") }),
      },
    };

    await expect(getManagerUser(supabase)).resolves.toBeNull();
  });
});
