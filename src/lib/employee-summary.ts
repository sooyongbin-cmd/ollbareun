export function employeeSummary(row: { employeeName: string; employeeRole?: string; workStyle?: string }) {
  const employeeRole = row.employeeRole || "-";
  const role = employeeRole === "경비원" ? "경비"
    : employeeRole === "미화원" ? "미화"
      : employeeRole === "주차원" ? "주차" : employeeRole;
  const workStyle = row.workStyle || "-";
  return `${row.employeeName} (${role},${workStyle.endsWith("근무") ? workStyle.slice(0, -2) : workStyle})`;
}
