import type { AssignmentRegistrationScope } from "./registration-result";

export type DetailEntity = "employee" | "worksite" | "assignment" | "site" | "resource" | "leave" | "remark" | "attendance" | "admin" | "config";
export type DetailData = Record<string, unknown>;
export type DetailChange = {
  entity: DetailEntity;
  id: string;
  action: "upsert" | "delete" | "invalidate";
  data?: DetailData;
  employeeId?: string;
  assignmentScope?: AssignmentRegistrationScope;
};

export function collectDetailChanges(previous: DetailChange[], incoming: DetailChange[]): DetailChange[] {
  const changes = new Map(previous.map((change) => [`${change.entity}:${change.id}`, change]));
  for (const change of incoming) {
    const key = `${change.entity}:${change.id}`;
    const before = changes.get(key);
    changes.set(key, { ...before, ...change, employeeId: change.employeeId ?? before?.employeeId, data: change.action === "delete" ? undefined : { ...before?.data, ...change.data } });
  }
  return [...changes.values()];
}

/** Preserve unrelated rows and their object identities; merge only server-confirmed fields. */
export function applyDetailChanges<T extends { id: string }>(rows: T[], changes: DetailChange[], entity: DetailEntity): T[] {
  const updates = new Map(changes.filter((change) => change.entity === entity).map((change) => [change.id, change]));
  return rows.flatMap((row) => {
    const change = updates.get(row.id);
    if (!change) return [row];
    if (change.action === "delete") return [];
    const fields = Object.fromEntries(Object.entries(change.data ?? {}).filter(([, value]) => value !== undefined));
    return change.data ? [{ ...row, ...fields, id: row.id } as T] : [row];
  });
}
