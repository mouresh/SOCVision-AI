import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Play, Save, Database, Terminal, Filter, AlertTriangle, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, CardHeader } from "@/components/soc/ui";
import { useSplunkEvents } from "@/hooks/useSplunkEvents";

export const Route = createFileRoute("/threat-hunting")({
  head: () => ({ meta: [{ title: "Threat Hunting — SOCVision AI" }] }),
  component: ThreatHunting,
});

const HUNTS = [
  {
    title: "Living-off-the-land binaries (LOLBins) spawned by Office apps",
    spl: `index=wineventlog EventCode=4688\n| where match(Process_Name, "(?i)\\\\(powershell|cmd|wscript)\\\\.exe$")\n| where Parent_Process_Name="WINWORD.EXE" OR Parent_Process_Name="EXCEL.EXE"\n| stats count by host, user, Process_Name, CommandLine\n| sort - count`,
    type: "powershell" as const,
  },
  {
    title: "Unsigned drivers loaded by SYSTEM in last 7d",
    spl: `index=wineventlog EventCode=7045 user="SYSTEM"\n| stats count by host, Service_Name, Image_Path`,
    type: "recent" as const,
  },
  {
    title: "First-time-seen DNS queries with high entropy",
    spl: `index=zeek query_type="DNS"\n| eval len=len(query)\n| where len > 20\n| stats count by query, host`,
    type: "recent" as const,
  },
  {
    title: "Successful logins from new ASN per privileged user",
    spl: `index=wineventlog EventCode=4624 user="system_admin"\n| stats count by host, user, IpAddress`,
    type: "brute_force" as const,
  },
  {
    title: "Service creation followed by network activity within 60s",
    spl: `index=wineventlog EventCode=7045\n| stats count by host, ServiceName, ImagePath`,
    type: "privilege_escalation" as const,
  },
];

function EventsSkeleton() {
  return (
    <div className="divide-y divide-border animate-pulse px-4 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="py-4 space-y-2">
          <div className="flex justify-between">
            <div className="h-3.5 w-48 bg-white/10 rounded" />
            <div className="h-4.5 w-20 bg-white/15 rounded" />
          </div>
          <div className="h-12 w-full bg-white/5 border border-border/20 rounded-md" />
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

function ThreatHunting() {
  const [splQuery, setSplQuery] = useState(HUNTS[0].spl);
  const [activeQuery, setActiveQuery] = useState<string | undefined>(undefined);
  const [activeType, setActiveType] = useState<
    "brute_force" | "privilege_escalation" | "powershell" | "recent" | undefined
  >("powershell");

  const [searchTerm, setSearchTerm] = useState("");
  const [eventIdFilter, setEventIdFilter] = useState("");
  const [hostFilter, setHostFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const limit = 50;

  // Splunk Events Live Query
  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useSplunkEvents({
    query: activeQuery,
    type: activeType,
    limit,
  });

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b._time).getTime() - new Date(a._time).getTime());
  }, [events]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((e) => {
      const matchSearch = !searchTerm || e.event.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEventId =
        !eventIdFilter || (e.eventCode || "").toLowerCase().includes(eventIdFilter.toLowerCase());
      const matchHost =
        !hostFilter || (e.host || "").toLowerCase().includes(hostFilter.toLowerCase());
      const matchUser =
        !userFilter || (e.user || "").toLowerCase().includes(userFilter.toLowerCase());
      return matchSearch && matchEventId && matchHost && matchUser;
    });
  }, [sortedEvents, searchTerm, eventIdFilter, hostFilter, userFilter]);

  const handleRunQuery = () => {
    setActiveType(undefined);
    setActiveQuery(splQuery);
  };

  const handleSelectHunt = (hunt: (typeof HUNTS)[0]) => {
    setSplQuery(hunt.spl);
    setActiveQuery(undefined);
    setActiveType(hunt.type);
  };

  return (
    <>
      <Topbar
        title="Threat Hunting"
        subtitle="SPL-style query workbench · backed by /api/v1/splunk/events"
      />
      <main className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Saved Hunts Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader title="Saved hunts" />
          <div className="divide-y divide-border">
            {HUNTS.map((h, i) => (
              <button
                key={i}
                onClick={() => handleSelectHunt(h)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  activeType === h.type && splQuery === h.spl
                    ? "bg-primary/10 border-l-2 border-primary"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="font-medium">{h.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Last run: {i + 1}h ago
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Workbench & Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* SPL editor */}
          <Card>
            <CardHeader
              title="Search"
              subtitle="Splunk Processing Language"
              right={
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-white/5 opacity-50 cursor-not-allowed">
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    onClick={handleRunQuery}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/95 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" /> Run
                  </button>
                </div>
              }
            />
            <div className="p-4">
              <div className="rounded-md border border-border bg-[oklch(0.14_0.02_252)] p-4 font-mono text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Terminal className="h-3.5 w-3.5" /> spl query
                </div>
                <textarea
                  value={splQuery}
                  onChange={(e) => setSplQuery(e.target.value)}
                  rows={5}
                  className="w-full bg-transparent text-foreground/90 font-mono text-sm outline-none border-none resize-none leading-relaxed focus:ring-0"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Database className="h-3.5 w-3.5" /> 4 indexes
                </span>
                <span>·</span>
                <span>Time range: last 24h</span>
                <span>·</span>
                <span className="text-success">{events.length} events retrieved</span>
              </div>
            </div>
          </Card>

          {/* Interactive Filters Bar */}
          <Card className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search event logs by description or raw text…"
                className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground/70"
              />
            </div>
            <div className="flex items-center gap-2 w-36">
              <input
                value={eventIdFilter}
                onChange={(e) => setEventIdFilter(e.target.value)}
                placeholder="Event ID…"
                className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none w-full placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex items-center gap-2 w-36">
              <input
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                placeholder="Host…"
                className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none w-full placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex items-center gap-2 w-36">
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Username…"
                className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none w-full placeholder:text-muted-foreground/60"
              />
            </div>
          </Card>

          {/* Events Results Panel */}
          <Card>
            <CardHeader title="Events" subtitle={`${filteredEvents.length} results`} />

            {isLoading ? (
              <EventsSkeleton />
            ) : isError ? (
              <ErrorBlock
                message="Failed to query Splunk events from backend API"
                onRetry={refetch}
              />
            ) : (
              <div className="divide-y divide-border max-h-[55vh] overflow-auto">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm italic">
                    No Splunk events found matching the query/filter parameters.
                  </div>
                ) : (
                  filteredEvents.map((e, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 hover:bg-white/5 border-b border-border/50 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-primary font-semibold">
                            {new Date(e._time).toLocaleString()}
                          </span>
                          <span>·</span>
                          <span>
                            Event ID:{" "}
                            <span className="font-mono text-foreground font-semibold">
                              {e.eventCode || "N/A"}
                            </span>
                          </span>
                          <span>·</span>
                          <span>
                            Source: <span className="text-foreground">{e.index || "splunk"}</span>
                          </span>
                          <span>·</span>
                          <span>
                            Sourcetype:{" "}
                            <span className="text-foreground">
                              {e.sourcetype || "splunk_event"}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-border/60 text-[9px] font-mono uppercase">
                            host: {e.host}
                          </span>
                          {e.user && e.user !== "unknown" && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-mono text-primary">
                              user: {e.user}
                            </span>
                          )}
                          {e.srcIp && (
                            <span className="px-1.5 py-0.5 rounded bg-high/10 border border-high/20 text-[9px] font-mono text-high">
                              src_ip: {e.srcIp}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-foreground/90 font-mono leading-relaxed bg-[oklch(0.12_0.01_252)]/50 border border-border/40 p-2 rounded whitespace-pre-wrap break-all">
                        {e.event}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
