export function durationLabel(clockInAt: string | null, clockOutAt: string | null) {
  if (!clockInAt || !clockOutAt) return "-";
  const start = new Date(clockInAt).getTime();
  const end = new Date(clockOutAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";

  const totalMinutes = Math.round((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}
