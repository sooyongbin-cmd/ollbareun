"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription className="leading-relaxed">{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full sm:w-auto" type="button" onClick={onClose}>
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
