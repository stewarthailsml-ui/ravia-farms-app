import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-card border border-hairline rounded-ravia shadow-card p-6 ${className}`}
      {...props}
    >
      {title ? <h2 className="text-xl font-semibold mb-4">{title}</h2> : null}
      {children}
    </div>
  );
}

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueClassName?: string;
}

export function StatCard({ icon, label, value, sub, valueClassName }: StatCardProps) {
  return (
    <div className="bg-card border border-hairline rounded-ravia shadow-card p-5">
      {icon ? <div className="text-accent text-xl mb-3">{icon}</div> : null}
      <div className="text-muted text-sm font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${valueClassName ?? "text-white"}`}>
        {value}
      </div>
      {sub ? <div className="text-muted text-sm mt-1">{sub}</div> : null}
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({ children, action }: SectionTitleProps) {
  return (
    <header className="flex justify-between items-center border-b border-hairline pb-5 mb-5">
      <h1 className="font-display text-2xl font-bold text-primary">{children}</h1>
      {action}
    </header>
  );
}
