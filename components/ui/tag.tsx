import { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-primary/15 text-primary",
  warning: "bg-accent/15 text-accent",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-white/10 text-muted",
};

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[0.7rem] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
