"use client";

import type { RegistrationResult } from "@/lib/registration-result";

import { useState, type ComponentType, type ReactNode } from "react";
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <Form modal onClose={() => setOpen(false)} onSaved={(result) => {
          setOpen(false);
          onSaved(result);
        }} />
      </DialogContent>
    </Dialog>
  );
}
