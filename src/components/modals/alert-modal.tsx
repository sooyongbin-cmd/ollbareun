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
  secondaryButtonLabel?: string;
  onSecondaryButtonClick?: () => void;
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  buttonLabel = "확인",
  secondaryButtonLabel,
  onSecondaryButtonClick,
}: AlertModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription className="leading-relaxed">{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="flex-row justify-end">
          <Button className="w-auto" type="button" onClick={onClose}>
            {buttonLabel}
          </Button>
          {secondaryButtonLabel && onSecondaryButtonClick ? (
            <Button className="w-auto" type="button" variant="outline" onClick={onSecondaryButtonClick}>
              {secondaryButtonLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
