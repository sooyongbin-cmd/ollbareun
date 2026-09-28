"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { elapsedTime, isScheduleDayOff, setScheduleDayOff, scheduleDayLabels, scheduleTimeDayTypes, weekDays, type ScheduleRule } from "@/lib/employee-schedule";

export function EmployeeScheduleFields({ rules, onChange, inTime, outTime, workStyle }: {
  rules: ScheduleRule[]; onChange: (rules: ScheduleRule[]) => void;
  inTime: string; outTime: string; workStyle: string;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-2 text-sm font-semibold">요일·공휴일별 설정</legend>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">휴무일 (복수 선택)</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {[...weekDays, "holiday" as const].map(day => (
            <label key={day} className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox aria-label={`${scheduleDayLabels[day]} 휴무`} checked={isScheduleDayOff(rules, day)}
                onCheckedChange={checked => onChange(setScheduleDayOff(rules, day, checked === true, inTime, outTime))} />
              {scheduleDayLabels[day]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">체크한 요일 또는 공휴일은 휴무입니다. 휴무 요일과 공휴일이 겹쳐도 쉽니다. 출근하는 공휴일의 시간은 공휴일 설정을 우선합니다. 격일근무는 배정 시작일부터 격일로 적용합니다.</p>
      {[...scheduleTimeDayTypes, ...weekDays.slice(0, 5).filter(day => rules.some(rule => rule.day_type === day && rule.is_working_day))].map((day) => {
        const rule = rules.find((item) => item.day_type === day);
        const mode = !rule ? "default" : rule.is_working_day ? "custom" : "off";
        const update = (value: ScheduleRule | null) => onChange([...rules.filter((item) => item.day_type !== day), ...(value ? [value] : [])]);
        return (
          <div key={day} className="grid items-center gap-2 sm:grid-cols-[5rem_1.3fr_1fr_1fr]">
            <span className="text-sm font-medium">{scheduleDayLabels[day]}</span>
            <NativeSelect aria-label={`${scheduleDayLabels[day]} 적용 방식`} value={mode} onChange={(event) => {
              const next = event.target.value;
              update(next === "default" ? null : { day_type: day, is_working_day: next === "custom", in_time: next === "custom" ? inTime : null,
                out_time: next === "custom" ? Number(outTime.slice(0, 2)) * 60 + Number(outTime.slice(3, 5)) : null });
            }}>
              <NativeSelectOption value="default">기본 설정 사용</NativeSelectOption>
              <NativeSelectOption value="custom">별도 시간 지정</NativeSelectOption>
              <NativeSelectOption value="off">휴무</NativeSelectOption>
            </NativeSelect>
            {mode === "custom" && rule ? <>
              <Input aria-label={`${scheduleDayLabels[day]} 출근`} type="time" value={rule.in_time?.slice(0, 5) ?? ""} required onChange={(event) => update({ ...rule, in_time: event.target.value })} />
              <Input aria-label={`${scheduleDayLabels[day]} 퇴근`} type="text" inputMode="numeric" placeholder="18:00" required
                pattern={workStyle === "0" ? "([01]\\d|2[0-3]):[0-5]\\d" : "([0-4]\\d):[0-5]\\d"}
                defaultValue={rule.out_time === null ? "" : elapsedTime(rule.out_time)}
                key={`${day}-${mode}-${workStyle}`}
                onChange={(event) => {
                  const value = event.target.value;
                  update({ ...rule, out_time: /^\d{2}:[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) : null });
                }} />
            </> : <span className="text-sm text-muted-foreground sm:col-span-2">{mode === "off" ? "휴무" : `${inTime} ~ ${outTime}`}</span>}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">다음 날 오전 6시 퇴근은 30:00으로 입력합니다. 등록된 국공휴일에 공휴일 설정을 적용합니다.</p>
    </fieldset>
  );
}
