import type { ReactNode } from "react";

type CardVariant = "raised" | "pressed" | "cream";

const variantClasses: Record<CardVariant, string> = {
  raised: "bg-base shadow-raised",
  pressed: "bg-base shadow-pressed",
  cream: "bg-cream shadow-raised-cream",
};

export function Card({
  variant = "raised",
  className = "",
  children,
}: {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}) {
  return <div className={`rounded-2xl p-4 ${variantClasses[variant]} ${className}`}>{children}</div>;
}
