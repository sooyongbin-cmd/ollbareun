export function formatSpecialRemarkDateTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function summarizeSpecialRemarkContent(content: string) {
  return `${content.split(/\r?\n/)[0]?.trim() ?? ""}....`;
}
