import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <Card className={className}>
      {title || description || actions ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions}
        </CardHeader>
      ) : null}
      <CardContent className={cn(!title && !description && !actions && "pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex min-h-28 items-center justify-center p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export function ErrorState({ title = "요청을 처리하지 못했습니다.", message }: { title?: string; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="자료를 불러오는 중입니다." className="space-y-3" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton className={cn("h-10 w-full", index === rows - 1 && "w-2/3")} key={index} />
      ))}
    </div>
  );
}
