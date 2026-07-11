"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { memo, useCallback, type ReactNode } from "react";

interface ModalProperties {
  children: ReactNode;
  dialogClassName?: string;
  mobileFullscreen?: boolean;
  onClose: () => void;
  open: boolean;
  title?: string;
}

const Modal = memo<ModalProperties>(
  ({
    children,
    dialogClassName,
    mobileFullscreen = false,
    onClose,
    open,
    title,
  }) => {
    const handleOpenChange = useCallback(
      (nextOpen: boolean) => {
        if (!nextOpen) {
          onClose();
        }
      },
      [onClose],
    );

    return (
      <DialogPrimitive.Root onOpenChange={handleOpenChange} open={open}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-11000 bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="pointer-events-none fixed inset-0 z-11000 flex items-center justify-center p-2 sm:p-4"
          >
            <div
              className={cn(
                "pointer-events-auto relative",
                mobileFullscreen
                  ? `inset-0 flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-y-auto rounded-none border-0 bg-background/95 p-3 shadow-lg backdrop-blur-xl sm:h-auto sm:max-h-[95dvh] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:rounded-3xl sm:border sm:border-border sm:p-4 lg:p-5`
                  : `flex max-h-[86dvh] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-y-auto rounded-3xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-xl sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:p-6`,
                dialogClassName,
              )}
            >
              <DialogPrimitive.Title
                className={
                  title
                    ? "text-base leading-none font-semibold sm:text-lg"
                    : "sr-only"
                }
              >
                {title ?? "Details"}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="absolute top-3 right-3 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none sm:top-4 sm:right-4"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
              <div className="mt-3 mb-1 flex min-h-0 flex-1 flex-col sm:mt-3 sm:mb-2">
                {children}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  },
);

Modal.displayName = "Modal";

export default Modal;
