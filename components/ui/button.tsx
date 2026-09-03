import type { ButtonHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";

type ButtonVariant = "primary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-slate text-white shadow-raised active:shadow-pressed",
  ghost: "bg-transparent text-ink underline-offset-2 hover:underline",
};

const baseClasses = "transition-press rounded-xl px-4 py-2 font-display font-semibold disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props} />
  );
}

/** Same visual treatment as Button, for when the action is a navigation rather than a submit. */
export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkProps & { variant?: ButtonVariant; className?: string; children: React.ReactNode }) {
  return (
    <Link className={`inline-block ${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
