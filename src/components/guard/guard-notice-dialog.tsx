"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface GuardNoticeDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
}

export function GuardNoticeDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  onConfirm,
  onOpenChange,
  dismissible = true,
}: GuardNoticeDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!dismissible && !newOpen) {
      // Prevent closing when not dismissible
      return;
    }
    onOpenChange?.(newOpen);
  };

  const handleConfirm = () => {
    onConfirm?.();
    if (dismissible) {
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={dismissible}
        onPointerDownOutside={(e) => {
          if (!dismissible) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!dismissible) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-center sm:text-left text-lg font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center sm:text-left text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            onClick={handleConfirm}
            className="w-full min-h-[44px] text-base font-medium"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
