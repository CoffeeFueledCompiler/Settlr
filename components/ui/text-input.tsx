import type { InputHTMLAttributes } from "react";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`transition-press shadow-raised focus:shadow-pressed rounded-xl border-none bg-base px-3 py-2 text-ink outline-none placeholder:text-ink/40 ${className}`}
      {...props}
    />
  );
}
