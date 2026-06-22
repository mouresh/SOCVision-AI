import type { ReactNode } from "react";
import type { Severity } from "@/types/soc";
import { severityBg } from "@/types/soc";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-card/70 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between p-4 border-b border-border">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SeverityBadge({ s }: { s: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${severityBg(s)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s}
    </span>
  );
}

export function Stat({
  label,
  value,
  delta,
  accent = "primary",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: "primary" | "critical" | "high" | "success";
  icon?: ReactNode;
}) {
  const accentMap = {
    primary: "from-primary/20 to-primary/0 text-primary",
    critical: "from-critical/25 to-critical/0 text-critical",
    high: "from-high/25 to-high/0 text-high",
    success: "from-success/25 to-success/0 text-success",
  } as const;
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card/70 p-4">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accentMap[accent]} opacity-60 pointer-events-none`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {delta && <span className="text-xs text-muted-foreground">{delta}</span>}
        </div>
      </div>
    </div>
  );
}
