import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "./Button";

type DialogProps = {
  open?: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Dialog({ open = true, title, children, onClose, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-overlay" role="presentation" onClick={onClose} />
        <RadixDialog.Content aria-describedby={undefined} className="dialog-content glass-panel fade-slide-in">
          <RadixDialog.Title className="dialog-title">{title}</RadixDialog.Title>
          <div className="dialog-body">{children}</div>
          <div className="dialog-footer">
            {footer ?? (
              <Button variant="primary" onClick={onClose}>
                确定
              </Button>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
