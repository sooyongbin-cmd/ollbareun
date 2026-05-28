"use client";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  buttonLabel?: string;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  buttonLabel = "확인",
}: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5">
      <div className="w-full max-w-[420px] rounded-[18px] bg-canvas p-6 shadow-product border border-hairline animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-[24px] font-semibold">{title}</h2>
        {description && <p className="mt-3 text-[16px] text-ink-muted-48 leading-relaxed">{description}</p>}

        <div className="mt-8">
          <button
            className="button-primary w-full"
            type="button"
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
