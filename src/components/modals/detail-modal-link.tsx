"use client";

import { collectDetailChanges, type DetailChange, type DetailData, type DetailEntity } from "@/lib/detail-changes";

import Link from "next/link";
import dynamic from "next/dynamic";
import { createContext, useContext, useRef, useState, type ComponentProps } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type DetailViewProps = {
  recordId?: string;
  modal?: boolean;
  onClose?: () => void;
  onSaved?: (data?: DetailData) => void;
  onDeleted?: (data?: DetailData) => void;
  onChanged?: (changes?: DetailChange[]) => void;
};

const ParentDetailChanged = createContext<((changes: DetailChange[]) => void) | undefined>(undefined);
const detailViews = [
  { entity: "employee" as DetailEntity, path: "/manager/employee/employees/save/", title: "직원 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/employees/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "worksite" as DetailEntity, path: "/manager/employee/worksites/save/", title: "근무지 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/worksites/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "assignment" as DetailEntity, path: "/manager/employee/assignments/save/", title: "근무지배정 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/assignments/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "site" as DetailEntity, path: "/manager/inspection/sites/", title: "점검지 상세", view: dynamic(() => import("@/app/manager/(protected)/inspection/sites/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "resource" as DetailEntity, path: "/manager/safety/resources/save/", title: "교육자료 상세", view: dynamic(() => import("@/app/manager/(protected)/safety/resources/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "leave" as DetailEntity, path: "/manager/leave/", title: "휴가상세", view: dynamic(() => import("@/app/manager/(protected)/leave/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "remark" as DetailEntity, path: "/manager/inspection/special-remarks/", title: "특이사항 상세", view: dynamic(() => import("@/app/manager/(protected)/inspection/special-remarks/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "attendance" as DetailEntity, path: "/manager/reports/attendance/detail/", title: "근태상세", view: dynamic(() => import("@/app/manager/(protected)/reports/attendance/detail/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "admin" as DetailEntity, path: "/manager/system/admin-users/save/", title: "관리자 상세", view: dynamic(() => import("@/app/manager/(protected)/system/admin-users/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { entity: "config" as DetailEntity, path: "/manager/system/configs/", title: "시스템설정 상세", view: dynamic(() => import("@/app/manager/(protected)/system/configs/[systemCode]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
];

type DetailModalLinkProps = Omit<ComponentProps<typeof Link>, "href" | "ref"> & {
  href: string;
  onSaved?: (changes: DetailChange[]) => void;
};

export default function DetailModalLink({ href, children, onSaved, onClick, ...linkProps }: DetailModalLinkProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const changes = useRef<DetailChange[]>([]);
  const parentChanged = useContext(ParentDetailChanged);
  const match = detailViews.find((entry) => href.startsWith(entry.path)
    && href.slice(entry.path.length) && !href.slice(entry.path.length).includes("/"));
  if (!match) return <Link href={href} onClick={onClick} {...linkProps}>{children}</Link>;
  const View = match.view;
  const recordId = decodeURIComponent(href.slice(match.path.length));

  function recordChanges(incoming: DetailChange[]) {
    changes.current = collectDetailChanges(changes.current, incoming);
  }

  function change(action: DetailChange["action"], data?: DetailData): DetailChange {
    const employeeId = data?.employee_id ?? data?.employeeId ?? (match!.entity === "employee" ? recordId : undefined);
    return { entity: match!.entity, id: recordId, action, data,
      employeeId: typeof employeeId === "string" ? employeeId : undefined };
  }

  function close() {
    setOpen(false);
    if (changes.current.length) {
      const saved = changes.current;
      changes.current = [];
      (onSaved ?? parentChanged)?.(saved);
    }
  }

  return (
    <>
      <Link {...linkProps} ref={trigger} href={href} onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || linkProps.target === "_blank") return;
        event.preventDefault();
        changes.current = [];
        setOpen(true);
      }}>{children}</Link>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
        <DialogContent
          className="max-h-[90dvh] min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-6xl"
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle className="text-[1.75rem] leading-[1.2]">{match.title}</DialogTitle>
          <ParentDetailChanged.Provider value={recordChanges}>
            <View recordId={recordId} modal onClose={close}
              onChanged={(nested) => recordChanges(nested ?? [change("invalidate")])}
              onSaved={(data) => recordChanges([change(data ? "upsert" : "invalidate", data)])}
              onDeleted={(data) => { recordChanges([change("delete", data)]); close(); }}
            />
          </ParentDetailChanged.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
