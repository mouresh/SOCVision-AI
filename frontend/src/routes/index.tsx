import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { ShieldAlert, Siren, Activity, TrendingUp, Bug, Globe2, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, CardHeader, Stat, SeverityBadge } from "@/components/soc/ui";
import { useAlerts, useAlertStats } from "@/hooks/useAlerts";
import { useRiskOverview } from "@/hooks/useRisk";
import { useIncidents } from "@/hooks/useIncidents";
import { useSplunkEvents } from "@/hooks/useSplunkEvents";
import { useMounted } from "@/hooks/useMounted";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — SOCVision AI" }] }),
  component: Dashboard,
});

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.025 255)",
  border: "1px solid oklch(0.3 0.03 250 / 0.6)",
  borderRadius: 8,
  fontSize: 12,
};

// Skeletons
function StatSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card/70 p-4 h-[106px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="animate-pulse h-3.5 w-24 bg-white/10 rounded" />
        <div className="animate-pulse h-5 w-5 bg-white/10 rounded-full" />
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="animate-pulse h-8 w-16 bg-white/15 rounded" />
        <div className="animate-pulse h-3 w-16 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card className="h-full">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="space-y-1">
          <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-72 w-full flex items-center justify-center bg-white/5 rounded-b-md animate-pulse">
        <span className="text-xs text-muted-foreground">Loading {title}...</span>
      </div>
    </Card>
  );
}

function TableSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <div className="p-4 border-b border-border">
        <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="divide-y divide-border/60 animate-pulse px-4 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3.5 flex items-center justify-between gap-4">
            <div className="h-4 w-12 bg-white/10 rounded" />
            <div className="h-4 flex-1 bg-white/15 rounded max-w-sm" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-destructive/20 bg-destructive/5 rounded-lg h-full min-h-[200px]">
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

function Dashboard() {
  const mounted = useMounted();
  // Hooks
  const alertsQuery = useAlerts({ limit: 100 });
  const statsQuery = useAlertStats();
  const riskQuery = useRiskOverview();
  const incidentsQuery = useIncidents({ limit: 100 });
  const splunkQuery = useSplunkEvents({ limit: 100 });

  // 1. KPI Calculations
  const statsData = statsQuery.data;
  const totalAlerts = useMemo(() => {
    if (!statsData) return 0;
    return Object.values(statsData.status).reduce((acc, val) => acc + val, 0);
  }, [statsData]);

  const openIncidentsCount = useMemo(() => {
    return incidentsQuery.data?.filter((i) => i.status !== "closed").length ?? 0;
  }, [incidentsQuery.data]);

  const criticalIncidentsCount = useMemo(() => {
    return (
      incidentsQuery.data?.filter((i) => i.status !== "closed" && i.severity === "critical")
        .length ?? 0
    );
  }, [incidentsQuery.data]);

  const criticalAlertsCount = statsData?.severity?.critical ?? 0;
  const riskScore = riskQuery.data?.overallRiskScore ?? 0;
  const riskLevel = riskQuery.data?.riskLevel ?? "Low";

  // 2. Alert Volume Chart Bucketing (Last 24 hours)
  const alertTrendData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 24 }).map((_, i) => {
      const d = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        hour: `${String(d.getHours()).padStart(2, "0")}:00`,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        timestamp: d.getTime(),
      };
    });

    const alerts = alertsQuery.data || [];
    alerts.forEach((a) => {
      const firedTime = new Date(a.timestamp).getTime();
      const diffHours = Math.floor((now.getTime() - firedTime) / (60 * 60 * 1000));
      if (diffHours >= 0 && diffHours < 24) {
        const bucketIndex = 23 - diffHours;
        const bucket = buckets[bucketIndex];
        if (bucket) {
          if (a.severity === "critical") bucket.critical++;
          else if (a.severity === "high") bucket.high++;
          else if (a.severity === "medium") bucket.medium++;
          else if (a.severity === "low") bucket.low++;
        }
      }
    });

    return buckets;
  }, [alertsQuery.data]);

  // 3. Top Attacking IPs from Splunk Event logs
  const topIpsData = useMemo(() => {
    const ipHits: Record<string, { ip: string; hits: number; country: string; threat: string }> =
      {};
    const events = splunkQuery.data || [];

    events.forEach((e) => {
      const ip = e.srcIp || e.host || "unknown";
      if (ip && ip !== "unknown" && ip !== "-") {
        if (!ipHits[ip]) {
          let country = "US";
          if (ip.startsWith("185.220") || ip.includes("185.220")) country = "RU";
          else if (ip.startsWith("45.77") || ip.includes("45.77")) country = "NL";
          else if (ip.startsWith("102.89") || ip.includes("102.89")) country = "NG";
          else if (ip.startsWith("176.10") || ip.includes("176.10")) country = "DE";

          ipHits[ip] = {
            ip,
            hits: 0,
            country,
            threat: e.event.length > 35 ? e.event.slice(0, 35) + "..." : e.event,
          };
        }
        ipHits[ip].hits++;
      }
    });

    return Object.values(ipHits)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 7);
  }, [splunkQuery.data]);

  // 4. MITRE Coverage mapping dynamically from alerts
  const mitreCoverageData = useMemo(() => {
    const TACTICS_ORDER = [
      { t: "Initial Access", key: "Initial Access" },
      { t: "Execution", key: "Execution" },
      { t: "Persistence", key: "Persistence" },
      { t: "Priv Esc", key: "Priv Esc" },
      { t: "Defense Evasion", key: "Defense Evasion" },
      { t: "Credentials", key: "Credentials" },
      { t: "Discovery", key: "Discovery" },
      { t: "Lateral", key: "Lateral" },
      { t: "Exfil", key: "Exfil" },
      { t: "Impact", key: "Impact" },
    ];

    const TACTIC_MAPPING: Record<string, string> = {
      T1566: "Initial Access",
      T1190: "Initial Access",
      T1078: "Initial Access",
      T1059: "Execution",
      T1204: "Execution",
      T1053: "Persistence",
      T1136: "Persistence",
      T1055: "Priv Esc",
      T1134: "Priv Esc",
      T1562: "Defense Evasion",
      T1027: "Defense Evasion",
      T1003: "Credentials",
      T1110: "Credentials",
      T1558: "Credentials",
      T1018: "Discovery",
      T1087: "Discovery",
      T1021: "Lateral",
      T1041: "Exfil",
      T1567: "Exfil",
      T1486: "Impact",
      // Splunk Event ID maps
      "4625": "Credentials",
      "4740": "Credentials",
      "4688": "Execution",
      "7045": "Persistence",
      "4728": "Initial Access",
      "4624": "Initial Access",
    };

    const tacticCounts: Record<string, number> = {};
    TACTICS_ORDER.forEach((t) => {
      tacticCounts[t.key] = 0;
    });

    const alerts = alertsQuery.data || [];
    alerts.forEach((a) => {
      const baseId = a.techniqueId ? a.techniqueId.split(".")[0] : "";
      const tactic = TACTIC_MAPPING[baseId || ""];
      if (tactic && tactic in tacticCounts) {
        tacticCounts[tactic]++;
      }
    });

    return TACTICS_ORDER.map((t) => ({
      t: t.t,
      c: tacticCounts[t.key] || 0,
    }));
  }, [alertsQuery.data]);

  return (
    <>
      <Topbar title="Executive Dashboard" subtitle="Real-time security posture · last 24h" />
      <main className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsQuery.isLoading ? (
            <StatSkeleton />
          ) : statsQuery.isError ? (
            <Card className="p-4 flex flex-col justify-between border-destructive/20 bg-destructive/5">
              <span className="text-xs text-destructive">Total Alerts failed</span>
              <button
                onClick={() => statsQuery.refetch()}
                className="text-[10px] text-left underline font-semibold mt-1"
              >
                Retry
              </button>
            </Card>
          ) : (
            <Stat
              label="Total Alerts"
              value={String(totalAlerts)}
              delta={criticalAlertsCount > 0 ? `${criticalAlertsCount} critical` : "No critical"}
              accent="primary"
              icon={<ShieldAlert className="h-4 w-4 text-primary" />}
            />
          )}

          {incidentsQuery.isLoading ? (
            <StatSkeleton />
          ) : incidentsQuery.isError ? (
            <Card className="p-4 flex flex-col justify-between border-destructive/20 bg-destructive/5">
              <span className="text-xs text-destructive">Incidents failed</span>
              <button
                onClick={() => incidentsQuery.refetch()}
                className="text-[10px] text-left underline font-semibold mt-1"
              >
                Retry
              </button>
            </Card>
          ) : (
            <Stat
              label="Active Incidents"
              value={String(openIncidentsCount)}
              delta={
                criticalIncidentsCount > 0 ? `${criticalIncidentsCount} critical` : "0 critical"
              }
              accent="critical"
              icon={<Siren className="h-4 w-4 text-critical" />}
            />
          )}

          <Stat
            label="MTTR"
            value="42m"
            delta="-8m this week"
            accent="success"
            icon={<Activity className="h-4 w-4 text-success" />}
          />

          {riskQuery.isLoading ? (
            <StatSkeleton />
          ) : riskQuery.isError ? (
            <Card className="p-4 flex flex-col justify-between border-destructive/20 bg-destructive/5">
              <span className="text-xs text-destructive">Risk Score failed</span>
              <button
                onClick={() => riskQuery.refetch()}
                className="text-[10px] text-left underline font-semibold mt-1"
              >
                Retry
              </button>
            </Card>
          ) : (
            <Stat
              label="Risk Score"
              value={String(riskScore)}
              delta={riskLevel}
              accent="high"
              icon={<TrendingUp className="h-4 w-4 text-high" />}
            />
          )}
        </div>

        {/* Charts & Gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {alertsQuery.isLoading ? (
            <div className="lg:col-span-2">
              <ChartSkeleton title="Alert Volume" />
            </div>
          ) : alertsQuery.isError ? (
            <div className="lg:col-span-2">
              <Card className="h-full min-h-[300px]">
                <ErrorBlock
                  message="Failed to load alert volume chart"
                  onRetry={() => alertsQuery.refetch()}
                />
              </Card>
            </div>
          ) : (
            <Card className="lg:col-span-2">
              <CardHeader
                title="Alert volume by severity"
                subtitle="Last 24 hours, hourly buckets"
                right={
                  <div className="flex gap-3 text-[10px]">
                    {[
                      ["Critical", "var(--critical)"],
                      ["High", "var(--high)"],
                      ["Medium", "var(--medium)"],
                      ["Low", "var(--low)"],
                    ].map(([l, c]) => (
                      <span key={l} className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
                        {l}
                      </span>
                    ))}
                  </div>
                }
              />
              <div className="h-72 p-4">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={alertTrendData}>
                      <defs>
                        {["critical", "high", "medium", "low"].map((k) => (
                          <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={`var(--${k})`} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={`var(--${k})`} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="oklch(0.3 0.03 250 / 0.3)" vertical={false} />
                      <XAxis dataKey="hour" stroke="oklch(0.7 0.03 240)" fontSize={11} interval={3} />
                      <YAxis stroke="oklch(0.7 0.03 240)" fontSize={11} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="low"
                        stackId="1"
                        stroke="var(--low)"
                        fill="url(#g-low)"
                      />
                      <Area
                        type="monotone"
                        dataKey="medium"
                        stackId="1"
                        stroke="var(--medium)"
                        fill="url(#g-medium)"
                      />
                      <Area
                        type="monotone"
                        dataKey="high"
                        stackId="1"
                        stroke="var(--high)"
                        fill="url(#g-high)"
                      />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke="var(--critical)"
                        fill="url(#g-critical)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-white/5 animate-pulse rounded flex items-center justify-center text-xs text-muted-foreground">
                    Loading charts...
                  </div>
                )}
              </div>
            </Card>
          )}

          {riskQuery.isLoading ? (
            <ChartSkeleton title="Organization Risk" />
          ) : riskQuery.isError ? (
            <Card className="h-full min-h-[300px]">
              <ErrorBlock
                message="Failed to load organization risk"
                onRetry={() => riskQuery.refetch()}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader title="Organization risk score" subtitle="Composite — 30 day trend" />
              <div className="p-4 flex flex-col items-center">
                <div className="h-44 w-full">
                  {mounted ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="70%"
                          outerRadius="100%"
                          data={[{ name: "risk", value: riskScore, fill: "var(--high)" }]}
                          startAngle={210}
                          endAngle={-30}
                        >
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <RadialBar
                            background={{ fill: "oklch(0.28 0.03 255)" }}
                            dataKey="value"
                            cornerRadius={8}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="-mt-28 text-center">
                        <div className="text-4xl font-bold text-glow">{riskScore}</div>
                        <div className="text-xs text-high uppercase tracking-wider">{riskLevel}</div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full w-full bg-white/5 animate-pulse rounded flex items-center justify-center text-xs text-muted-foreground">
                      Loading gauge...
                    </div>
                  )}
                </div>
                <div className="h-20 w-full mt-4">
                  {mounted ? (
                    <ResponsiveContainer>
                      <LineChart data={riskQuery.data?.trend || []}>
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full bg-white/5 animate-pulse rounded" />
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Live Alerts & Top Attacking IPs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {alertsQuery.isLoading ? (
            <div className="lg:col-span-2">
              <TableSkeleton title="Live Alerts" />
            </div>
          ) : alertsQuery.isError ? (
            <div className="lg:col-span-2">
              <Card className="h-full min-h-[250px]">
                <ErrorBlock
                  message="Failed to load alert stream"
                  onRetry={() => alertsQuery.refetch()}
                />
              </Card>
            </div>
          ) : (
            <Card className="lg:col-span-2">
              <CardHeader
                title="Live alert stream"
                subtitle="Newest first"
                right={
                  <span className="text-[10px] flex items-center gap-1.5 text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </span>
                }
              />
              <div className="divide-y divide-border max-h-[420px] overflow-auto">
                {alertsQuery.data.slice(0, 10).map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-12 items-center px-4 py-2.5 text-sm hover:bg-white/5"
                  >
                    <div className="col-span-1">
                      <SeverityBadge s={a.severity} />
                    </div>
                    <div className="col-span-5 truncate font-medium">{a.title}</div>
                    <div className="col-span-2 font-mono text-xs text-muted-foreground truncate">
                      {a.sourceIp}
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground truncate">
                      {a.technique}
                    </div>
                    <div className="col-span-2 text-right text-[11px] text-muted-foreground font-mono">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {splunkQuery.isLoading ? (
            <ChartSkeleton title="Top Attacking IPs" />
          ) : splunkQuery.isError ? (
            <Card className="h-full min-h-[250px]">
              <ErrorBlock
                message="Failed to load attacking IPs"
                onRetry={() => splunkQuery.refetch()}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Top attacking IPs"
                subtitle="By hits — last 24h"
                right={<Globe2 className="h-4 w-4 text-muted-foreground" />}
              />
              <div className="p-4 h-72">
                <ResponsiveContainer>
                  <BarChart data={topIpsData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid stroke="oklch(0.3 0.03 250 / 0.25)" horizontal={false} />
                    <XAxis type="number" stroke="oklch(0.7 0.03 240)" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="ip"
                      stroke="oklch(0.7 0.03 240)"
                      fontSize={10}
                      width={110}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="hits" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Incidents & MITRE coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {incidentsQuery.isLoading ? (
            <TableSkeleton title="Active Incidents" />
          ) : incidentsQuery.isError ? (
            <Card className="h-full min-h-[250px]">
              <ErrorBlock
                message="Failed to load incidents list"
                onRetry={() => incidentsQuery.refetch()}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Active incidents"
                subtitle="Owned by SOC team"
                right={<Bug className="h-4 w-4 text-muted-foreground" />}
              />
              <div className="divide-y divide-border">
                {incidentsQuery.data.slice(0, 5).map((i) => (
                  <div key={i.id} className="px-4 py-3 flex items-start gap-3">
                    <SeverityBadge s={i.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{i.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.id} · {i.alerts} alerts · {i.owner}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{i.created}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {alertsQuery.isLoading ? (
            <ChartSkeleton title="MITRE Tactic Coverage" />
          ) : alertsQuery.isError ? (
            <Card className="h-full min-h-[250px]">
              <ErrorBlock
                message="Failed to load MITRE coverage"
                onRetry={() => alertsQuery.refetch()}
              />
            </Card>
          ) : (
            <Card>
              <CardHeader title="Detection coverage" subtitle="By MITRE tactic" />
              <div className="p-4 h-72">
                <ResponsiveContainer>
                  <BarChart data={mitreCoverageData}>
                    <CartesianGrid stroke="oklch(0.3 0.03 250 / 0.25)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      stroke="oklch(0.7 0.03 240)"
                      fontSize={10}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="oklch(0.7 0.03 240)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="c" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
