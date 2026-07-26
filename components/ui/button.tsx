import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "success" | "outline" | "danger" | "deploy";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  success: "bg-primary text-white hover:bg-primary-dark",
  outline: "bg-transparent border border-hairline text-white hover:bg-white/5",
  danger:
    "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
  deploy:
    "bg-accent text-white shadow-[0_4px_12px_rgba(245,130,32,0.3)] hover:bg-accent-dark",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[0.7rem]",
  md: "px-5 py-2.5 text-[0.85rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "outline", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
