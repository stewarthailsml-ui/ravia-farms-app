import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full p-3 bg-[#1a1a1a] border border-hairline rounded-lg text-white outline-none transition-colors focus:border-primary";
const labelClass = "block mb-2 text-[0.8rem] font-semibold text-muted uppercase tracking-wide";

export function FormGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

// The prototype's two-column form row (e.g. Qty / Unit Price side by side).
export function InputRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

// The dashed-border live-math preview box (veg stems/cost, revenue total).
export function CalcPreview({ tone = "primary", children }: { tone?: "primary" | "accent"; children: ReactNode }) {
  const toneClass =
    tone === "accent"
      ? "border-accent bg-accent/10 [&_span]:text-accent"
      : "border-primary bg-primary/10 [&_span]:text-primary";
  return (
    <div className={`mb-5 rounded-lg border border-dashed p-3 text-[0.85rem] ${toneClass} [&_span]:font-bold`}>
      {children}
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-4 justify-end">{children}</div>;
}
