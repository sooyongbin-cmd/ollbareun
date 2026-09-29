import type { SupabaseClient } from "@supabase/supabase-js";

/** Both attendance entry points use this transaction; education failures roll back attendance. */
export async function saveAttendanceWithEducation(
  supabase: SupabaseClient,
  input: { recordId?: string; values: Record<string, unknown>; guardClockIn?: boolean },
) {
  const { data, error } = await supabase.rpc("save_attendance_with_education", {
    p_record_id: input.recordId ?? null,
    p_values: input.values,
    p_guard_clock_in: input.guardClockIn ?? false,
  }).single();
  if (error) throw new Error(error.message || "출근 및 교육 대상 저장에 실패했습니다.");
  return data;
}
