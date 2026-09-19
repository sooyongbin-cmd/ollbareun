"use client";

import { LoaderCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProcessingModalProps {
  isOpen: boolean;
  message: string;
}

export default function ProcessingModal({ isOpen, message }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">처리 중</DialogTitle>
          <DialogDescription asChild>
            <div aria-live="polite" className="flex items-center justify-center gap-3 text-base" role="status">
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary" />
              <span>{message}</span>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
