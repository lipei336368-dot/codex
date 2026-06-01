import clsx from "clsx";

type ToastProps = {
  message: string;
  tone?: "success" | "error" | "warning" | "neutral";
  placement?: "center" | "bottom";
};

export function Toast({ message, tone = "neutral", placement = "bottom" }: ToastProps) {
  return (
    <div role="status" className={clsx("toast", `toast-${tone}`, placement === "center" && "toast-center")}>
      {message}
    </div>
  );
}
