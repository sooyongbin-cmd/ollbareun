"use client";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "예",
  cancelLabel = "아니오",
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5">
      <div className="w-full max-w-[420px] rounded-[18px] bg-canvas p-6 shadow-product border border-hairline animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-[24px] font-semibold">{title}</h2>
        {description && <p className="mt-3 text-[16px] text-ink-muted-48 leading-relaxed">{description}</p>}

        <div className="mt-8 flex gap-3">
          <button
            className="button-primary flex-1"
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </button>
          <button
            className="button-secondary flex-1"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
