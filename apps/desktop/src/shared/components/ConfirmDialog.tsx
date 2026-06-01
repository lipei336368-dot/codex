import { useEffect, useState } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  countdownSeconds?: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  countdownSeconds = 0,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const [remaining, setRemaining] = useState(countdownSeconds);

  useEffect(() => {
    if (countdownSeconds <= 0) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdownSeconds]);

  const disabled = remaining > 0;
  const buttonLabel = disabled ? `${confirmLabel} ${remaining}` : confirmLabel;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="dialog app-dialog-surface confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant="danger" disabled={disabled} onClick={onConfirm}>
            {buttonLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
