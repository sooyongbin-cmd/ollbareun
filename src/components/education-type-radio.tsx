import { educationTypes, educationTypeLabels, type EducationType } from "@/lib/education-periods";

export default function EducationTypeRadio({ value, onChange }: { value?: EducationType; onChange?: (value: EducationType) => void }) {
  return <fieldset className="space-y-3">
    <legend className="text-sm font-semibold text-muted-foreground">안전교육구분</legend>
    <div className="flex flex-wrap gap-5">
      {educationTypes.map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="radio" name="educationType" value={type} required
          checked={value === undefined ? undefined : value === type}
          defaultChecked={value === undefined ? type === "daily" : undefined}
          onChange={() => onChange?.(type)} className="size-4 accent-primary" />
        {educationTypeLabels[type]}
      </label>)}
    </div>
  </fieldset>;
}
