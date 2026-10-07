import { Input } from "@/components/ui/input";

export default function EducationResourceDates({ startdate, enddate, onStartChange, onEndChange, disabled = false }: {
  startdate?: string; enddate?: string; onStartChange?: (date: string) => void; onEndChange?: (date: string) => void; disabled?: boolean;
}) {
  return <div className="flex flex-wrap gap-4">
    <div className="space-y-2">
      <label htmlFor="resource-startdate" className="block text-sm font-semibold text-muted-foreground">시작일</label>
      <Input id="resource-startdate" name="startdate" type="date" required disabled={disabled} value={startdate} onChange={(event) => onStartChange?.(event.target.value)} />
    </div>
    <div className="space-y-2">
      <label htmlFor="resource-enddate" className="block text-sm font-semibold text-muted-foreground">종료일</label>
      <Input id="resource-enddate" name="enddate" type="date" required disabled={disabled} value={enddate} onChange={(event) => onEndChange?.(event.target.value)} />
    </div>
  </div>;
}
