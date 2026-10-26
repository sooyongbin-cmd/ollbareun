"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { createContext, useContext, useRef, useState, type ComponentProps } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type DetailViewProps = {
  recordId?: string;
  modal?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  onChanged?: () => void;
};

const ParentDetailChanged = createContext<(() => void) | undefined>(undefined);
const detailViews = [
  { path: "/manager/employee/employees/save/", title: "직원 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/employees/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/employee/worksites/save/", title: "근무지 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/worksites/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/employee/assignments/save/", title: "근무지배정 상세", view: dynamic(() => import("@/app/manager/(protected)/employee/assignments/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/inspection/sites/", title: "점검지 상세", view: dynamic(() => import("@/app/manager/(protected)/inspection/sites/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/safety/resources/save/", title: "교육자료 상세", view: dynamic(() => import("@/app/manager/(protected)/safety/resources/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/leave/", title: "휴가상세", view: dynamic(() => import("@/app/manager/(protected)/leave/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/inspection/special-remarks/", title: "특이사항 상세", view: dynamic(() => import("@/app/manager/(protected)/inspection/special-remarks/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/reports/attendance/detail/", title: "근태상세", view: dynamic(() => import("@/app/manager/(protected)/reports/attendance/detail/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/system/admin-users/save/", title: "관리자 상세", view: dynamic(() => import("@/app/manager/(protected)/system/admin-users/save/[id]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
  { path: "/manager/system/configs/", title: "시스템설정 상세", view: dynamic(() => import("@/app/manager/(protected)/system/configs/[systemCode]/detail-form"), { loading: () => <p role="status">불러오는 중...</p> }) },
];

type DetailModalLinkProps = Omit<ComponentProps<typeof Link>, "href" | "ref"> & {
  href: string;
  onSaved?: () => void;
};

export default function DetailModalLink({ href, children, onSaved, onClick, ...linkProps }: DetailModalLinkProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const changed = useRef(false);
  const parentChanged = useContext(ParentDetailChanged);
  const match = detailViews.find((entry) => href.startsWith(entry.path)
    && href.slice(entry.path.length) && !href.slice(entry.path.length).includes("/"));
  if (!match) return <Link href={href} onClick={onClick} {...linkProps}>{children}</Link>;
  const View = match.view;
  const recordId = decodeURIComponent(href.slice(match.path.length));

  function close() {
    setOpen(false);
    if (changed.current) {
      changed.current = false;
      (onSaved ?? parentChanged)?.();
    }
  }

  return (
    <>
      <Link {...linkProps} ref={trigger} href={href} onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || linkProps.target === "_blank") return;
        event.preventDefault();
        changed.current = false;
        setOpen(true);
      }}>{children}</Link>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-6xl"
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle className="text-[1.75rem] leading-[1.2]">{match.title}</DialogTitle>
          <ParentDetailChanged.Provider value={() => { changed.current = true; }}>
            <View recordId={recordId} modal onClose={close} onChanged={() => { changed.current = true; }} onSaved={() => {
              changed.current = true;
              close();
            }} />
          </ParentDetailChanged.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
