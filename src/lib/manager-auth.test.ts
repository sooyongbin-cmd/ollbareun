import { describe, expect, it, vi } from "vitest";
import { createInitialSuperAdmin, createManagerAuthRedirectUrl, getManagerUser } from "./manager-auth";

function createAdminLookupClient(adminRow: unknown) {
  return {
    from: (table: string) => {
      expect(table).toBe("admin_users");

      return {
        select: (columns: string) => {
          expect(columns).toBe("user_id,role");

          return {
            eq: (column: string, value: string) => {
              expect(column).toBe("user_id");
              expect(value).toBe("user-1");

              return {
                maybeSingle: async () => ({ data: adminRow, error: null }),
              };
            },
          };
        },
      };
    },
  };
}

function createLegacyAdminLookupClient(adminRow: unknown) {
  const select = (columns: string) => ({
    eq: (column: string, value: string) => ({
      maybeSingle: async () => {
        if (columns === "user_id,role") {
          expect(column).toBe("user_id");
          expect(value).toBe("user-1");

          return {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'user_id' column of 'admin_users' in the schema cache",
            },
          };
        }

        expect(columns).toBe("id,role");
        expect(column).toBe("id");
        expect(value).toBe("user-1");

        return { data: adminRow, error: null };
      },
    }),
  });

  return {
    from: (table: string) => {
      expect(table).toBe("admin_users");

      return { select };
    },
  };
}

function createLegacyAdminInsertClient() {
  const insert = vi.fn((row: Record<string, string>) => ({
    select: () => ({
      single: async () => {
        if ("user_id" in row) {
          return {
            data: null,
            error: {
              code: "PGRST204",
              message: "Could not find the 'user_id' column of 'admin_users' in the schema cache",
            },
          };
        }

        return { data: { id: row.id, role: row.role }, error: null };
      },
    }),
  }));

  return {
    insert,
    client: {
      from: (table: string) => {
        expect(table).toBe("admin_users");

        return { insert };
      },
    },
  };
}

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

  it("returns the authenticated manager user when the auth user exists in admin_users", async () => {
    const user = { id: "user-1", app_metadata: { provider: "email" } };
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    };

    await expect(getManagerUser(supabase, createAdminLookupClient({ user_id: "user-1", role: "admin" }))).resolves.toEqual(
      user,
    );
  });

  it("returns null when the authenticated user is not in admin_users", async () => {
    const user = { id: "user-1", app_metadata: { provider: "email" } };
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    };

    await expect(getManagerUser(supabase, createAdminLookupClient(null))).resolves.toBeNull();
  });

  it("uses id as the auth user id when the existing admin_users table has no user_id column", async () => {
    const user = { id: "user-1", app_metadata: { provider: "google" } };
    const supabase = {
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
      },
    };

    await expect(getManagerUser(supabase, createLegacyAdminLookupClient({ id: "user-1", role: "admin" }))).resolves.toEqual(
      user,
    );
  });

  it("creates the initial super admin with id when the existing admin_users table has no user_id column", async () => {
    const admin = createLegacyAdminInsertClient();

    await expect(
      createInitialSuperAdmin({ id: "user-1", email: "owner@example.com" }, admin.client as never),
    ).resolves.toEqual({ id: "user-1", role: "super_admin" });

    expect(admin.insert).toHaveBeenNthCalledWith(1, {
      user_id: "user-1",
      email: "owner@example.com",
      role: "super_admin",
    });
    expect(admin.insert).toHaveBeenNthCalledWith(2, {
      id: "user-1",
      email: "owner@example.com",
      role: "super_admin",
    });
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
