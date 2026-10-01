import type { SupabaseClient } from "@supabase/supabase-js";

/** Save attendance without creating education records; completion is recorded separately. */
export async function saveAttendance(
  supabase: SupabaseClient,
  input: { recordId?: string; values: Record<string, unknown>; guardClockIn?: boolean },
) {
  const { data, error } = await supabase.rpc("save_attendance", {
    p_record_id: input.recordId ?? null,
    p_values: input.values,
    p_guard_clock_in: input.guardClockIn ?? false,
  }).single();
  if (error) throw new Error(error.message || "근태 저장에 실패했습니다.");
  return data;
}
