"use client";

import type { RegistrationFormProps } from "@/components/modals/registration-modal";
import SystemConfigForm from "../system-config-form";

export default function NewSystemConfigPage({ modal = false, onClose, onSaved }: RegistrationFormProps) {
  return (
    <section className="space-y-[1.5rem]">
      {!modal ? <header>
        <h1 className="text-[1.75rem] leading-[1.2]">시스템설정 등록</h1>
      </header> : null}

      <SystemConfigForm mode="create" modal={modal} onClose={onClose} onSaved={onSaved} />
    </section>
  );
}
