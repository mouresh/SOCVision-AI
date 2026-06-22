import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Filter,
  Download,
  Brain,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
  Shield,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, SeverityBadge } from "@/components/soc/ui";
import { useAlerts } from "@/hooks/useAlerts";
import { useAIAnalysis, useRequestAIAnalysis } from "@/hooks/useAIAnalysis";
import { type Severity } from "@/types/soc";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — SOCVision AI" }] }),
  component: AlertsPage,
});

const SEVS: Severity[] = ["critical", "high", "medium", "low", "info"];
const SOURCES = [
  "all",
  "splunk",
  "wazuh",
  "EDR",
  "Windows Event",
  "Zeek",
  "Entra ID",
  "Firewall",
  "Sysmon",
  "AD",
  "NetFlow",
  "CloudTrail",
  "verification-script",
];
const STATUSES = ["all", "new", "investigating", "resolved"];

function TableSkeleton() {
  return (
    <div className="divide-y divide-border/60 animate-pulse px-4 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="py-4.5 flex items-center justify-between gap-4">
          <div className="h-4 w-12 bg-white/10 rounded" />
          <div className="h-4 w-16 bg-white/10 rounded font-mono" />
          <div className="h-4 flex-1 bg-white/15 rounded max-w-md" />
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="h-4 w-24 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-destructive/20 bg-destructive/5 rounded-lg">
      <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-destructive font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors"
      >
        <RefreshCw className="h-3 w-3" /> Retry Connection
      </button>
    </div>
  );
}

function AlertsPage() {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(undefined);

  const limit = 15;

  // Live Query
  const {
    data: alerts = [],
    isLoading,
    isError,
    refetch,
  } = useAlerts({
    page,
    limit,
    search: q || undefined,
    severity: sev === "all" ? undefined : sev,
    status: statusFilter === "all" ? undefined : statusFilter,
    source: sourceFilter === "all" ? undefined : sourceFilter,
  });

  const selectedAlert = useMemo(() => {
    return alerts.find((a) => a.id === selectedAlertId);
  }, [alerts, selectedAlertId]);

  return (
    <>
      <Topbar title="Alerts" subtitle="Real-time security alerts triage" />
      <main className="p-6 space-y-4">
        {/* Filters */}
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by title, IP, user, technique…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/70"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none max-w-[150px]"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-md bg-card border border-border">
            {(["all", ...SEVS] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSev(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider ${
                  sev === s
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </Card>

        {/* Data Table */}
        {isLoading ? (
          <Card>
            <TableSkeleton />
          </Card>
        ) : isError ? (
          <ErrorBlock message="Failed to load alert records from backend API" onRetry={refetch} />
        ) : (
          <Card>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-card/60">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5">Severity</th>
                    <th className="text-left px-4 py-2.5">ID</th>
                    <th className="text-left px-4 py-2.5">Title</th>
                    <th className="text-left px-4 py-2.5">Source</th>
                    <th className="text-left px-4 py-2.5">Risk Score</th>
                    <th className="text-left px-4 py-2.5">Risk Level</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Assigned Analyst</th>
                    <th className="text-right px-4 py-2.5">Fired At</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">
                        No active alerts match the filters.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAlertId(a.id)}
                        className="border-b border-border/60 hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <SeverityBadge s={a.severity} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {a.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{a.title}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.source}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <span
                            className={`font-semibold ${
                              (a.riskScore ?? 0) >= 80
                                ? "text-critical"
                                : (a.riskScore ?? 0) >= 50
                                  ? "text-high"
                                  : (a.riskScore ?? 0) >= 20
                                    ? "text-medium"
                                    : "text-success"
                            }`}
                          >
                            {a.riskScore ?? "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {a.riskLevel ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.riskLevel === "CRITICAL"
                                  ? "bg-critical/10 text-critical border border-critical/20"
                                  : a.riskLevel === "HIGH"
                                    ? "bg-high/10 text-high border border-high/20"
                                    : a.riskLevel === "MEDIUM"
                                      ? "bg-medium/10 text-medium border border-medium/20"
                                      : "bg-success/10 text-success border border-success/20"
                              }`}
                            >
                              {a.riskLevel}
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                              a.status === "new"
                                ? "border-critical/40 text-critical bg-critical/10"
                                : a.status === "investigating"
                                  ? "border-high/40 text-high bg-high/10"
                                  : "border-success/40 text-success bg-success/10"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{a.assignedTo || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">
                          {new Date(a.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to="/ai-analyst"
                            search={{ alertId: a.id }}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-glow"
                          >
                            <Brain className="h-3.5 w-3.5" /> Analyze
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/20 text-xs">
              <span className="text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={alerts.length < limit}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Alert Details Drawer */}
      <AlertDrawer
        alert={selectedAlert}
        open={selectedAlertId !== undefined}
        onClose={() => setSelectedAlertId(undefined)}
      />
    </>
  );
}

// Sub-component: Alert Drawer
function AlertDrawer({ alert, open, onClose }: { alert: any; open: boolean; onClose: () => void }) {
  const aiQuery = useAIAnalysis(alert?.id);
  const aiMutation = useRequestAIAnalysis();

  if (!alert) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[450px] sm:w-[540px] overflow-y-auto border-l border-border bg-card/95 backdrop-blur-md p-6 text-sm text-foreground"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{alert.id}</span>
            <SeverityBadge s={alert.severity} />
          </div>
          <SheetTitle className="text-xl font-bold mt-1.5 leading-snug">{alert.title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Source: <span className="font-semibold">{alert.source}</span> · Status:{" "}
            <span className="uppercase font-semibold">{alert.status}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* General Information */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              General Info
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-md border border-border/60 bg-white/5 p-3.5">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground block">Source IP</span>
                <span className="font-mono font-medium">{alert.sourceIp}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground block">Dest IP</span>
                <span className="font-mono font-medium">{alert.destIp}</span>
              </div>
              <div className="col-span-2 border-t border-border/40 pt-2 mt-2">
                <span className="text-[10px] uppercase text-muted-foreground block">
                  Target User
                </span>
                <span className="font-medium text-primary">{alert.user}</span>
              </div>
            </div>
            {alert.description && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-2 bg-card border border-border/40 p-2.5 rounded">
                {alert.description}
              </p>
            )}
          </div>

          {/* Risk Metrics */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Risk Metrics
            </h3>
            <div className="flex gap-4 items-center bg-card border border-border/80 rounded-md p-4">
              <div className="text-center bg-white/5 border border-border rounded-lg p-2 min-w-[70px]">
                <span className="text-[9px] uppercase text-muted-foreground block">Score</span>
                <span className="text-2xl font-bold font-mono text-glow text-primary">
                  {alert.riskScore ?? "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground block">Level</span>
                <span
                  className={`text-sm font-extrabold ${
                    alert.riskLevel === "CRITICAL"
                      ? "text-critical"
                      : alert.riskLevel === "HIGH"
                        ? "text-high"
                        : alert.riskLevel === "MEDIUM"
                          ? "text-medium"
                          : "text-success"
                  }`}
                >
                  {alert.riskLevel || "N/A"}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Calculated by Risk Engine v1.0
                </span>
              </div>
            </div>
          </div>

          {/* MITRE Mapping */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              MITRE ATT&CK Mapping
            </h3>
            <div className="bg-card border border-border/80 rounded-md p-4 space-y-2">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground block">Tactic</span>
                <span className="font-semibold text-primary">
                  {alert.technique ? alert.technique : "N/A"}
                </span>
              </div>
              <div className="border-t border-border/40 pt-2 mt-2">
                <span className="text-[10px] uppercase text-muted-foreground block">
                  Technique ID
                </span>
                <span className="font-mono text-xs bg-white/10 rounded px-1.5 py-0.5 font-semibold text-foreground">
                  {alert.techniqueId}
                </span>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assignments
            </h3>
            <div className="flex items-center gap-3 bg-white/5 border border-border/60 p-3.5 rounded-md">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground block">
                  Lead Analyst
                </span>
                <span className="font-semibold text-sm">{alert.assignedTo || "Unassigned"}</span>
              </div>
            </div>
          </div>

          {/* AI Analysis Status */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              AI Triage Status
            </h3>
            {aiQuery.isLoading ? (
              <div className="flex items-center gap-2 p-3 bg-white/5 border border-border/50 rounded-md animate-pulse">
                <Cpu className="h-4 w-4 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">
                  Checking cache triage records...
                </span>
              </div>
            ) : aiMutation.isPending ? (
              <div className="flex flex-col gap-2 p-4 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex items-center gap-2 text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-semibold">
                    AI analyst is running dynamic playbook...
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary animate-progress rounded-full"
                    style={{ width: "70%" }}
                  />
                </div>
              </div>
            ) : aiQuery.data ? (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary uppercase">
                    <Cpu className="h-3.5 w-3.5" /> AI Report Available
                  </span>
                  <Link
                    to="/ai-analyst"
                    search={{ alertId: alert.id }}
                    className="text-xs underline text-primary font-medium hover:text-glow"
                  >
                    View Report
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-primary/10 pt-2">
                  {aiQuery.data.executiveSummary}
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-md p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cpu className="h-4 w-4" />
                  <span className="text-xs">No LLM triage report found.</span>
                </div>
                <button
                  onClick={() => aiMutation.mutate({ alertId: alert.id })}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-colors cursor-pointer"
                >
                  <Cpu className="h-3.5 w-3.5" /> Run AI Triage Engine
                </button>
              </div>
            )}
          </div>

          {/* Raw Event JSON */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Raw Event JSON
            </h3>
            <div className="max-h-56 overflow-auto bg-black/60 border border-border/80 rounded-md p-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <pre>{JSON.stringify(alert.rawEvent || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
