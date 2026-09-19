"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoaderCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
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
  loadingLabel = "처리중입니다...",
}: ConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {loading ? (
            <AlertDialogDescription asChild>
              <div aria-live="polite" className="flex items-center gap-2" role="status">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                <span>{loadingLabel}</span>
              </div>
            </AlertDialogDescription>
          ) : description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {!loading ? (
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
            <AlertDialogCancel onClick={onClose}>{cancelLabel}</AlertDialogCancel>
          </AlertDialogFooter>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
