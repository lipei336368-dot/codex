import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} ${isLoading ? "button-loading" : ""} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
}
