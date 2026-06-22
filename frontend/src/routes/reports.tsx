import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileText, Download, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, CardHeader, Stat } from "@/components/soc/ui";
import { useAlerts } from "@/hooks/useAlerts";
import { useIncidents } from "@/hooks/useIncidents";
import { useRiskOverview } from "@/hooks/useRisk";
import { useSplunkEvents } from "@/hooks/useSplunkEvents";
import { useMounted } from "@/hooks/useMounted";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — SOCVision AI" }] }),
  component: ReportsPage,
});

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.025 255)",
  border: "1px solid oklch(0.3 0.03 250 / 0.6)",
  borderRadius: 8,
  fontSize: 12,
};

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-white/5 border border-border/20 rounded-lg" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-72 bg-white/5 border border-border/20 rounded-lg animate-pulse grid place-items-center">
      <div className="space-y-2 text-center">
        <div className="h-4 w-32 bg-white/10 rounded mx-auto" />
        <div className="h-3 w-20 bg-white/5 rounded mx-auto" />
      </div>
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

// Client-side exporters
const exportJson = (data: any[], filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportCsv = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header];
        const cell =
          val === null || val === undefined
            ? ""
            : typeof val === "object"
              ? JSON.stringify(val)
              : val.toString();
        return `"${cell.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function ReportsPage() {
  const mounted = useMounted();
  // Query live metrics
  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    refetch: refetchAlerts,
  } = useAlerts({ limit: 100 });
  const {
    data: incidents = [],
    isLoading: isIncidentsLoading,
    isError: isIncidentsError,
    refetch: refetchIncidents,
  } = useIncidents({ limit: 100 });
  const {
    data: riskData,
    isLoading: isRiskLoading,
    isError: isRiskError,
    refetch: refetchRisk,
  } = useRiskOverview();
  const {
    data: splunkEvents = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
    refetch: refetchEvents,
  } = useSplunkEvents({ limit: 100 });

  const isLoading = isAlertsLoading || isIncidentsLoading || isRiskLoading || isEventsLoading;
  const isError = isAlertsError || isIncidentsError || isRiskError || isEventsError;

  const handleRetryAll = () => {
    refetchAlerts();
    refetchIncidents();
    refetchRisk();
    refetchEvents();
  };

  // Severity Distribution for Pie Chart
  const severityDist = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    alerts.forEach((a) => {
      if (counts[a.severity] !== undefined) counts[a.severity]++;
    });
    return [
      { name: "Critical", value: counts.critical, color: "var(--critical)" },
      { name: "High", value: counts.high, color: "var(--high)" },
      { name: "Medium", value: counts.medium, color: "var(--medium)" },
      { name: "Low", value: counts.low, color: "var(--low)" },
      { name: "Info", value: counts.info, color: "var(--info)" },
    ].filter((item) => item.value > 0);
  }, [alerts]);

  // Resolved Incidents stats
  const resolvedIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status === "closed" || i.status === "contained").length;
  }, [incidents]);

  // Unique MITRE techniques
  const mitreCoverageCount = useMemo(() => {
    const uniques = new Set(alerts.map((a) => a.techniqueId).filter((id) => id && id !== "-"));
    return uniques.size;
  }, [alerts]);

  // Top Event Sources
  const topSources = useMemo(() => {
    const counts: Record<string, number> = {};
    splunkEvents.forEach((e) => {
      const src = e.index || "splunk";
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [splunkEvents]);

  // Top Event IDs
  const topEventIds = useMemo(() => {
    const counts: Record<string, number> = {};
    splunkEvents.forEach((e) => {
      const code = e.eventCode || "unknown";
      counts[code] = (counts[code] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [splunkEvents]);

  return (
    <>
      <Topbar title="Executive Reports" subtitle="Board-ready security metrics" />
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> Reporting period: Last 30 days
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed">
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>

        {/* KPI metrics row */}
        {isLoading ? (
          <StatsSkeleton />
        ) : isError ? (
          <ErrorBlock message="Failed to load report summary stats" onRetry={handleRetryAll} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Total alerts"
              value={alerts.length.toString()}
              delta="Live SIEM"
              accent="primary"
            />
            <Stat
              label="Incidents resolved"
              value={`${resolvedIncidentsCount} / ${incidents.length}`}
              delta="Kanban Board"
              accent="success"
            />
            <Stat
              label="MITRE technique coverage"
              value={mitreCoverageCount.toString()}
              delta="Unique tactics"
              accent="success"
            />
            <Stat
              label="Avg threat risk score"
              value={
                riskData?.overallRiskScore
                  ? Math.round(riskData.overallRiskScore).toString()
                  : "N/A"
              }
              delta={riskData?.riskLevel || "N/A"}
              accent="primary"
            />
          </div>
        )}

        {/* Charts Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <div>
              <ChartSkeleton />
            </div>
          </div>
        ) : isError ? (
          <Card className="p-6 text-center text-muted-foreground italic text-xs">
            Charts unavailable due to API query failure.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Risk scorecard Line Chart */}
            <Card className="lg:col-span-2">
              <CardHeader title="Risk score trend" subtitle="Composite organizational risk · 30d" />
              <div className="h-72 p-4">
                {mounted && riskData?.trend && riskData.trend.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={riskData.trend}>
                      <defs>
                        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--primary)" />
                          <stop offset="100%" stopColor="var(--high)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="oklch(0.3 0.03 250 / 0.25)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="oklch(0.7 0.03 240)"
                        fontSize={11}
                        interval={3}
                      />
                      <YAxis stroke="oklch(0.7 0.03 240)" fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#lg)"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : !mounted ? (
                  <div className="h-full w-full bg-white/5 animate-pulse rounded flex items-center justify-center text-xs text-muted-foreground">
                    Loading trend...
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    No risk trend data observed.
                  </div>
                )}
              </div>
            </Card>

            {/* Severity Distribution Pie Chart */}
            <Card>
              <CardHeader title="Alert distribution" subtitle="By severity" />
              <div className="h-72 p-4">
                {mounted && severityDist.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={severityDist}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {severityDist.map((s) => (
                          <Cell key={s.name} fill={s.color} stroke="oklch(0.18 0.02 250)" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : !mounted ? (
                  <div className="h-full w-full bg-white/5 animate-pulse rounded flex items-center justify-center text-xs text-muted-foreground">
                    Loading distribution...
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                    No alerts in SIEM to analyze distribution.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Event Sources and Event IDs widgets */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Top Event Sources" subtitle="By Splunk log index volume" />
              <div className="p-4 space-y-3">
                {topSources.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No event sources recorded.</p>
                ) : (
                  topSources.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-mono text-muted-foreground">index={s.name}</span>
                      <span className="font-semibold text-primary">{s.value} logs</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Top Event IDs" subtitle="By log event frequency" />
              <div className="p-4 space-y-3">
                {topEventIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No Event IDs recorded.</p>
                ) : (
                  topEventIds.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-mono text-muted-foreground">EventID: {e.code}</span>
                      <span className="font-semibold text-primary">{e.count} hits</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Live Logs Export Panel */}
        <Card>
          <CardHeader title="Available reports & Live exports" />
          <div className="divide-y divide-border">
            {/* Live Alerts Export Row */}
            <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/5">
              <div className="h-10 w-10 rounded-md bg-primary/15 grid place-items-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">SIEM Alerts Log</div>
                <div className="text-xs text-muted-foreground">
                  Live Database · {alerts.length} records
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCsv(alerts, "siem_alerts_log.csv")}
                  disabled={alerts.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportJson(alerts, "siem_alerts_log.json")}
                  disabled={alerts.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>

            {/* Live Incidents Export Row */}
            <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/5">
              <div className="h-10 w-10 rounded-md bg-primary/15 grid place-items-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Incident Management Log</div>
                <div className="text-xs text-muted-foreground">
                  Live Database · {incidents.length} records
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCsv(incidents, "incidents_log.csv")}
                  disabled={incidents.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportJson(incidents, "incidents_log.json")}
                  disabled={incidents.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>

            {/* Live Splunk Events Export Row */}
            <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/5">
              <div className="h-10 w-10 rounded-md bg-primary/15 grid place-items-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Splunk Threat Hunting Log</div>
                <div className="text-xs text-muted-foreground">
                  Live SIEM · {splunkEvents.length} logs
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCsv(splunkEvents, "splunk_threat_hunting_log.csv")}
                  disabled={splunkEvents.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button
                  onClick={() => exportJson(splunkEvents, "splunk_threat_hunting_log.json")}
                  disabled={splunkEvents.length === 0}
                  className="text-xs text-primary inline-flex items-center gap-1 hover:text-glow disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </button>
              </div>
            </div>

            {/* Static PDF options as per original design */}
            {[
              ["Monthly Executive Summary", "Nov 2025", "PDF · 8 pages"],
              ["Quarterly Risk Review", "Q3 2025", "PDF · 24 pages"],
              ["MITRE ATT&CK Coverage Report", "Last 30d", "PDF · 12 pages"],
            ].map(([title, period, meta]) => (
              <div key={title} className="px-4 py-3 flex items-center gap-3 hover:bg-white/5">
                <div className="h-10 w-10 rounded-md bg-primary/15 grid place-items-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">
                    {period} · {meta}
                  </div>
                </div>
                <button className="text-xs text-primary inline-flex items-center gap-1 opacity-50 cursor-not-allowed">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
