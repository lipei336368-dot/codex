type ToastHostProps = {
  message: string;
  kind?: "success" | "error" | "info";
};

export function ToastHost({ message, kind = "info" }: ToastHostProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`app-toast app-toast-${kind}`} role="status">
      {message}
    </div>
  );
}
