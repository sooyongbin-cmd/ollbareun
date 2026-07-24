import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingBoardProps = {
  className?: string;
  label?: string;
};

export default function LoadingBoard({
  className,
  label = "자료를 불러오는 중입니다.",
}: LoadingBoardProps) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn("inline-flex min-h-16 min-w-16 items-center justify-center text-muted-foreground", className)}
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-7 animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
