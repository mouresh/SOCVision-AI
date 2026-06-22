import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Siren,
  Plus,
  UserCircle2,
  Clock,
  Filter,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, SeverityBadge } from "@/components/soc/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useIncidents,
  useIncidentDetails,
  useAddIncidentComment,
  type Severity,
} from "@/hooks/useIncidents";
import { useAlertRiskScore } from "@/hooks/useRisk";

export const Route = createFileRoute("/incidents")({
  head: () => ({ meta: [{ title: "Incidents — SOCVision AI" }] }),
  component: IncidentsPage,
});

const COLS = [
  { key: "open", label: "Open", tone: "text-critical" },
  { key: "in_progress", label: "Investigating", tone: "text-high" },
  { key: "contained", label: "Resolved", tone: "text-medium" },
  { key: "closed", label: "Closed", tone: "text-success" },
] as const;

const SEVS: Severity[] = ["critical", "high", "medium", "low", "info"];

function ColumnSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between px-1">
        <div className="h-4 w-20 bg-white/10 rounded" />
        <div className="h-4 w-6 bg-white/10 rounded" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/15 rounded" />
          </div>
          <div className="h-4 w-3/4 bg-white/15 rounded" />
          <div className="h-3 w-full bg-white/10 rounded font-mono" />
          <div className="flex justify-between pt-2 border-t border-border/20">
            <div className="h-3 w-8 bg-white/10 rounded" />
            <div className="h-3 w-12 bg-white/10 rounded" />
            <div className="h-3 w-12 bg-white/10 rounded" />
          </div>
        </Card>
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

function DrawerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse py-4">
      <div className="space-y-2">
        <div className="h-4 w-1/3 bg-white/10 rounded" />
        <div className="h-6 w-3/4 bg-white/15 rounded" />
      </div>
      <div className="h-24 w-full bg-white/5 border border-border/40 rounded-md" />
      <div className="space-y-2">
        <div className="h-4 w-1/4 bg-white/10 rounded" />
        <div className="h-16 w-full bg-white/5 border border-border/40 rounded-md" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/4 bg-white/10 rounded" />
        <div className="h-32 w-full bg-white/5 border border-border/40 rounded-md" />
      </div>
    </div>
  );
}

function IncidentDrawer({
  uuid,
  open,
  onClose,
}: {
  uuid: string | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const { data: details, isLoading, isError } = useIncidentDetails(uuid);
  const addComment = useAddIncidentComment();
  const [commentText, setCommentText] = useState("");

  const sourceAlertId = details?.incident?.metadata?.source_alert_id || details?.alertIds?.[0];
  const { data: riskData, isLoading: isRiskLoading } = useAlertRiskScore(sourceAlertId);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !uuid) return;
    try {
      await addComment.mutateAsync({
        incidentId: uuid,
        body: commentText.trim(),
        authorId: "11111111-1111-1111-1111-111111111111",
        isInternal: true,
      });
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  if (!open) return null;

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
        {isLoading ? (
          <DrawerSkeleton />
        ) : isError || !details ? (
          <div className="py-12 text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Failed to load incident details.</p>
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {details.incident.id}
                </span>
                <SeverityBadge s={details.incident.severity} />
              </div>
              <SheetTitle className="text-xl font-bold mt-1.5 leading-snug">
                {details.incident.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Priority: <span className="font-semibold">P{details.incident.priority}</span> ·
                Status:{" "}
                <span className="uppercase font-semibold">
                  {details.incident.status.replace("_", " ")}
                </span>
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
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Assigned Analyst
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{details.incident.owner}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Created Time
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{details.incident.created}</span>
                    </div>
                  </div>
                </div>
                {details.incident.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2 bg-card border border-border/40 p-2.5 rounded">
                    {details.incident.description}
                  </p>
                )}
              </div>

              {/* Risk Assessment */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Risk Metrics
                </h3>
                <div className="flex gap-4 items-center bg-card border border-border/80 rounded-md p-4">
                  {isRiskLoading ? (
                    <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
                  ) : riskData ? (
                    <>
                      <div className="text-center bg-white/5 border border-border rounded-lg p-2 min-w-[70px]">
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Risk Score
                        </span>
                        <span
                          className={`text-2xl font-black ${
                            riskData.score >= 80
                              ? "text-critical"
                              : riskData.score >= 50
                                ? "text-high"
                                : riskData.score >= 20
                                  ? "text-medium"
                                  : "text-success"
                          }`}
                        >
                          {Math.round(riskData.score)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] uppercase text-muted-foreground block">
                          Calculated Risk Level
                        </span>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                            riskData.score >= 80
                              ? "bg-critical/15 text-critical border-critical/30"
                              : riskData.score >= 50
                                ? "bg-high/15 text-high border-high/30"
                                : riskData.score >= 20
                                  ? "bg-medium/15 text-medium border-medium/30"
                                  : "bg-success/15 text-success border-success/30"
                          }`}
                        >
                          {riskData.score >= 80
                            ? "CRITICAL"
                            : riskData.score >= 50
                              ? "HIGH"
                              : riskData.score >= 20
                                ? "MEDIUM"
                                : "LOW"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground text-xs italic">
                      No risk metrics available for this incident (no linked alerts or no calculated
                      scores).
                    </div>
                  )}
                </div>
              </div>

              {/* Threat Intelligence / Metadata */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Threat Intelligence & Metadata
                </h3>
                <div className="rounded-md border border-border bg-white/5 p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Source Type
                      </span>
                      <span className="font-semibold text-primary">
                        {details.incident.metadata?.source_type || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">
                        Source Alert ID
                      </span>
                      <span className="font-mono text-xs text-muted-foreground break-all">
                        {details.incident.metadata?.source_alert_id || "N/A"}
                      </span>
                    </div>
                  </div>

                  {details.alertIds?.length > 0 && (
                    <div className="border-t border-border/40 pt-3">
                      <span className="text-[10px] uppercase text-muted-foreground block mb-1.5">
                        Linked Alerts ({details.alertIds.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details.alertIds.map((alertId) => (
                          <span
                            key={alertId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-border/60 text-[10px] font-mono"
                          >
                            <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                            {alertId.slice(0, 8)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Thread */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comments Timeline
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {details.comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No comments logged yet. Add initial assessment below.
                    </p>
                  ) : (
                    details.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3.5 rounded border border-border bg-card/60 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground inline-flex items-center gap-1">
                            <UserCircle2 className="h-3 w-3" /> analyst1
                          </span>
                          <span className="text-[10px] font-mono">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="leading-relaxed text-muted-foreground">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSubmitComment} className="flex gap-2 pt-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add notes, updates, or containment actions..."
                    className="flex-1 bg-white/5 border border-border/60 rounded px-3 py-2 text-xs focus:border-primary/50 outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={addComment.isPending || !commentText.trim()}
                    className="inline-flex items-center justify-center p-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IncidentsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [selectedIncidentUuid, setSelectedIncidentUuid] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  const {
    data: incidents = [],
    isLoading,
    isError,
    refetch,
  } = useIncidents({
    status: statusFilter === "all" ? undefined : statusFilter,
    severity: severityFilter === "all" ? undefined : severityFilter,
    search: debouncedQ || undefined,
  });

  const columnsData = useMemo(() => {
    return COLS.map((col) => {
      const items = incidents.filter((i) => i.status === col.key);
      return {
        ...col,
        count: items.length,
        items,
      };
    });
  }, [incidents]);

  return (
    <>
      <Topbar title="Incident Management" subtitle="Triage, assign, contain" />
      <main className="p-6 space-y-4">
        {/* Filters */}
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by title or description…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border text-xs rounded px-2.5 py-1.5 focus:border-primary/50 outline-none"
            >
              <option value="all">ALL STATUSES</option>
              <option value="open">OPEN</option>
              <option value="in_progress">INVESTIGATING</option>
              <option value="contained">RESOLVED</option>
              <option value="closed">CLOSED</option>
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-md bg-card border border-border">
            {(["all", ...SEVS] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase tracking-wider ${
                  severityFilter === s
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Dynamic Column Counters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            {columnsData.map((c) => (
              <div key={c.key} className="px-4 py-2 rounded-md border border-border bg-card/70">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </div>
                <div className={`text-xl font-bold ${c.tone}`}>{c.count}</div>
              </div>
            ))}
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed">
            <Plus className="h-4 w-4" /> New Incident
          </button>
        </div>

        {/* Kanban Board Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ColumnSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorBlock message="Failed to load incidents from backend API" onRetry={refetch} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columnsData.map((col) => (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${col.tone}`}>
                    {col.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">{col.count}</span>
                </div>

                {col.items.length === 0 ? (
                  <div className="border border-dashed border-border/40 rounded-lg p-6 text-center text-xs text-muted-foreground italic">
                    No incidents
                  </div>
                ) : (
                  col.items.map((i) => (
                    <Card
                      key={i.uuid}
                      onClick={() => setSelectedIncidentUuid(i.uuid)}
                      className="p-4 hover:border-primary/40 transition-colors cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{i.id}</span>
                        <SeverityBadge s={i.severity} />
                      </div>
                      <h4 className="text-sm font-semibold leading-snug">{i.title}</h4>
                      {i.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {i.description}
                        </p>
                      )}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Siren className="h-3 w-3" />
                          {i.alerts}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCircle2 className="h-3 w-3" />
                          {i.owner}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {i.created}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Details Drawer */}
      <IncidentDrawer
        uuid={selectedIncidentUuid}
        open={selectedIncidentUuid !== undefined}
        onClose={() => setSelectedIncidentUuid(undefined)}
      />
    </>
  );
}
