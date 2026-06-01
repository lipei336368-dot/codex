import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: "default" | "soft" | "accent";
};

export function Card({ children, className = "", tone = "default", ...props }: CardProps) {
  return (
    <section className={`card card-${tone} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

