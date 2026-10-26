import type { DetailData } from "./detail-changes";

export type AssignmentRegistrationScope = { employeeId: string; startDate: string; endDate: string };
export type RegistrationResult = { record: DetailData; assignmentScope?: AssignmentRegistrationScope };

/** Insert the server-created row once, retaining existing rows and their joined fields. */
export function addRegisteredRow<T extends object>(rows: T[], record: DetailData, key: keyof T = "id" as keyof T): T[] {
  const id = record[String(key)];
  if (typeof id !== "string" || !id) throw new Error("등록된 자료의 식별자를 확인하지 못했습니다.");
  const fields = Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
  if (rows.some((row) => row[key] === id)) return rows.map((row) => row[key] === id ? { ...row, ...fields } : row);
  return [fields as T, ...rows];
}
