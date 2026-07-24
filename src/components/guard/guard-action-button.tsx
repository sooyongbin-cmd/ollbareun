"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface GuardActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const GuardActionButton = React.forwardRef<
  HTMLButtonElement,
  GuardActionButtonProps
>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading = false,
      loadingText,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        className={cn(
          "w-full min-h-[48px] text-base font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] whitespace-normal break-words",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-5 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </Button>
    );
  }
);

GuardActionButton.displayName = "GuardActionButton";
