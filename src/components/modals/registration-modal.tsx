"use client";

import type { RegistrationResult } from "@/lib/registration-result";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type RegistrationFormProps = {
  modal?: boolean;
  onClose?: () => void;
  onSaved?: (result: RegistrationResult) => void;
};

export default function RegistrationModal({ title, className, children, form: Form, onSaved, disabled = false }: {
  title: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  form: ComponentType<RegistrationFormProps>;
  onSaved: (result: RegistrationResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const pending = useRef<RegistrationResult[]>([]);
  function close() {
    setOpen(false);
    const results = pending.current;
    pending.current = [];
    results.forEach((result) => onSaved(result));
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) setOpen(true); else close(); }}>
      <DialogTrigger asChild>
        <button type="button" className={className} disabled={disabled}>{children}</button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"
        aria-describedby={undefined}
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="text-[1.75rem] leading-[1.2]">{title}</DialogTitle>
        <Form modal onClose={close} onSaved={(result) => {
          pending.current.push(result);
        }} />
      </DialogContent>
    </Dialog>
  );
}
