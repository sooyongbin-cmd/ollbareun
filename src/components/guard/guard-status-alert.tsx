"use client";

import * as React from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type GuardStatusType = "info" | "success" | "warning" | "error";

interface GuardStatusAlertProps extends React.ComponentProps<"div"> {
  status: GuardStatusType;
  title?: string;
  description: React.ReactNode;
}

const statusConfig: Record<
  GuardStatusType,
  {
    icon: React.ComponentType<{ className?: string }>;
    variantClass: string;
    defaultTitle: string;
  }
> = {
  info: {
    icon: Info,
    variantClass: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 [&>svg]:text-blue-600",
    defaultTitle: "안내",
  },
  success: {
    icon: CheckCircle2,
    variantClass: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 [&>svg]:text-emerald-600",
    defaultTitle: "완료",
  },
  warning: {
    icon: AlertTriangle,
    variantClass: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 [&>svg]:text-amber-600",
    defaultTitle: "주의",
  },
  error: {
    icon: XCircle,
    variantClass: "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200 [&>svg]:text-rose-600",
    defaultTitle: "오류",
  },
};

export function GuardStatusAlert({
  status,
  title,
  description,
  className,
  ...props
}: GuardStatusAlertProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.variantClass, className)} {...props}>
      <Icon className="size-5 shrink-0" />
      <div>
        <AlertTitle role="heading" aria-level={2} className="font-semibold text-base">
          {title || config.defaultTitle}
        </AlertTitle>
        <AlertDescription className="text-sm mt-1 leading-relaxed text-inherit opacity-90">
          {description}
        </AlertDescription>
      </div>
    </Alert>
  );
}
