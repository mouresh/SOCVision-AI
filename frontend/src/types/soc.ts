export type Severity = "critical" | "high" | "medium" | "low" | "info";

export function severityColor(s: Severity) {
  return {
    critical: "text-critical",
    high: "text-high",
    medium: "text-medium",
    low: "text-low",
    info: "text-info",
  }[s];
}

export function severityBg(s: Severity) {
  return {
    critical: "bg-critical/15 text-critical border border-critical/30",
    high: "bg-high/15 text-high border border-high/30",
    medium: "bg-medium/15 text-medium border border-medium/30",
    low: "bg-low/15 text-low border border-low/30",
    info: "bg-info/15 text-info border border-info/30",
  }[s];
}
