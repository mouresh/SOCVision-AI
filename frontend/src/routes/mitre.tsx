import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ShieldAlert, AlertTriangle, RefreshCw, Clock, Bot, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, CardHeader, SeverityBadge } from "@/components/soc/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAlerts } from "@/hooks/useAlerts";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";

export const Route = createFileRoute("/mitre")({
  head: () => ({ meta: [{ title: "MITRE ATT&CK — SOCVision AI" }] }),
  component: MitrePage,
});

const TECHNIQUE_TO_TACTIC: Record<string, string> = {
  T1566: "Initial Access",
  "T1566.001": "Initial Access",
  T1190: "Initial Access",
  T1078: "Initial Access",
  "T1078.001": "Initial Access",
  "T1078.002": "Initial Access",
  "T1078.003": "Initial Access",
  "T1078.004": "Initial Access",

  T1059: "Execution",
  "T1059.001": "Execution",
  "T1059.003": "Execution",
  "T1059.005": "Execution",
  T1204: "Execution",

  T1053: "Persistence",
  "T1053.005": "Persistence",
  T1547: "Persistence",
  "T1547.001": "Persistence",
  T1136: "Persistence",
  "T1136.001": "Persistence",

  T1055: "Privilege Escalation",
  T1068: "Privilege Escalation",
  T1134: "Privilege Escalation",
  T1543: "Privilege Escalation",
  "T1543.003": "Privilege Escalation",

  T1562: "Defense Evasion",
  "T1562.001": "Defense Evasion",
  T1027: "Defense Evasion",
  T1070: "Defense Evasion",

  T1003: "Credential Access",
  "T1003.001": "Credential Access",
  T1110: "Credential Access",
  T1558: "Credential Access",
  "T1558.003": "Credential Access",

  T1018: "Discovery",
  T1087: "Discovery",
  T1531: "Discovery",

  T1021: "Lateral Movement",
  "T1021.001": "Lateral Movement",
  "T1021.002": "Lateral Movement",

  T1041: "Exfiltration",
  T1567: "Exfiltration",
  "T1567.002": "Exfiltration",

  T1486: "Impact",
  T1490: "Impact",
};

const MITRE_TEMPLATE = [
  {
    tactic: "Initial Access",
    techniques: [
      { id: "T1566", name: "Phishing" },
      { id: "T1190", name: "Exploit Public-Facing App" },
      { id: "T1078", name: "Valid Accounts" },
    ],
  },
  {
    tactic: "Execution",
    techniques: [
      { id: "T1059.001", name: "PowerShell" },
      { id: "T1059.003", name: "Windows Cmd" },
      { id: "T1204", name: "User Execution" },
    ],
  },
  {
    tactic: "Persistence",
    techniques: [
      { id: "T1053.005", name: "Scheduled Task" },
      { id: "T1547.001", name: "Run Keys" },
      { id: "T1136", name: "Create Account" },
    ],
  },
  {
    tactic: "Privilege Escalation",
    techniques: [
      { id: "T1055", name: "Process Injection" },
      { id: "T1068", name: "Exploitation for Priv Esc" },
      { id: "T1134", name: "Token Manipulation" },
      { id: "T1543.003", name: "Windows Service" },
    ],
  },
  {
    tactic: "Defense Evasion",
    techniques: [
      { id: "T1562.001", name: "Disable Defenses" },
      { id: "T1027", name: "Obfuscated Files" },
      { id: "T1070", name: "Indicator Removal" },
    ],
  },
  {
    tactic: "Credential Access",
    techniques: [
      { id: "T1003.001", name: "LSASS Dumping" },
      { id: "T1110", name: "Brute Force" },
      { id: "T1558.003", name: "Kerberoasting" },
    ],
  },
  {
    tactic: "Discovery",
    techniques: [
      { id: "T1018", name: "Remote System Discovery" },
      { id: "T1087", name: "Account Discovery" },
      { id: "T1531", name: "Account Access Removal" },
    ],
  },
  {
    tactic: "Lateral Movement",
    techniques: [
      { id: "T1021.001", name: "RDP" },
      { id: "T1021.002", name: "SMB/Admin Shares" },
    ],
  },
  {
    tactic: "Exfiltration",
    techniques: [
      { id: "T1041", name: "Exfil over C2" },
      { id: "T1567.002", name: "Exfil to Cloud" },
    ],
  },
  {
    tactic: "Impact",
    techniques: [
      { id: "T1486", name: "Data Encrypted" },
      { id: "T1490", name: "Inhibit System Recovery" },
    ],
  },
];

function heat(hits: number) {
  if (hits >= 15) return "bg-critical/30 border-critical/60 text-critical hover:bg-critical/40";
  if (hits >= 8) return "bg-high/25 border-high/50 text-high hover:bg-high/35";
  if (hits >= 3) return "bg-medium/20 border-medium/40 text-medium hover:bg-medium/30";
  if (hits >= 1) return "bg-low/15 border-low/30 text-low hover:bg-low/25";
  return "bg-card border-border text-muted-foreground hover:bg-white/5";
}

function MitreMatrixSkeleton() {
  return (
    <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-2 min-w-max animate-pulse">
      {Array.from({ length: 10 }).map((_, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-1.5">
          <div className="h-6 bg-white/10 rounded w-3/4 border-b border-border pb-1 mb-1" />
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <div key={rowIdx} className="h-14 bg-white/5 border border-border/20 rounded-md p-2" />
          ))}
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

function TechniqueDetailsDrawer({
  tech,
  open,
  onClose,
}: {
  tech: { id: string; name: string; hits: number; alerts: any[] } | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const [activeAlertId, setActiveAlertId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (tech?.alerts && tech.alerts.length > 0) {
      setActiveAlertId(tech.alerts[0].id);
    } else {
      setActiveAlertId(undefined);
    }
  }, [tech]);

  const { data: analysis, isLoading: isAnalysisLoading } = useAIAnalysis(activeAlertId);

  const activeAlert = useMemo(() => {
    return tech?.alerts?.find((a) => a.id === activeAlertId);
  }, [tech, activeAlertId]);

  if (!tech) return null;

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
            <span className="font-mono text-xs text-primary font-bold">{tech.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-border">
              {tech.hits} {tech.hits === 1 ? "alert" : "alerts"}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-1.5 leading-snug">{tech.name}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Enterprise MITRE ATT&CK technique details and correlated threat intelligence.
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* Related Alerts list */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Related Alerts ({tech.alerts.length})
            </h3>
            {tech.alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No active threat detections for this technique.
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {tech.alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActiveAlertId(a.id)}
                    className={`w-full text-left p-2.5 rounded border text-xs flex items-center justify-between gap-3 transition-colors ${
                      activeAlertId === a.id
                        ? "bg-primary/10 border-primary/50"
                        : "bg-card border-border hover:bg-white/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>{a.source}</span>
                        <span>·</span>
                        <span className="font-mono text-[9px]">{a.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityBadge s={a.severity} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert details & AI Summary */}
          {activeAlert && (
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Alert intelligence
              </h3>

              <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-md border border-border p-3.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">
                    Risk Score
                  </span>
                  <span
                    className={`font-semibold font-mono text-sm ${
                      (activeAlert.riskScore ?? 0) >= 80
                        ? "text-critical"
                        : (activeAlert.riskScore ?? 0) >= 50
                          ? "text-high"
                          : (activeAlert.riskScore ?? 0) >= 20
                            ? "text-medium"
                            : "text-success"
                    }`}
                  >
                    {activeAlert.riskScore ?? "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">
                    Risk Level
                  </span>
                  {activeAlert.riskLevel ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        activeAlert.riskLevel === "CRITICAL"
                          ? "bg-critical/15 text-critical border-critical/30"
                          : activeAlert.riskLevel === "HIGH"
                            ? "bg-high/15 text-high border-high/30"
                            : activeAlert.riskLevel === "MEDIUM"
                              ? "bg-medium/15 text-medium border-medium/30"
                              : "bg-success/15 text-success border-success/30"
                      }`}
                    >
                      {activeAlert.riskLevel}
                    </span>
                  ) : (
                    "N/A"
                  )}
                </div>
                <div className="col-span-2 border-t border-border/20 pt-2 mt-1">
                  <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">
                    Fired At
                  </span>
                  <span className="font-mono text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(activeAlert.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* AI Report Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Bot className="h-4 w-4" /> LLM Analysis summary
                  </h4>
                  {isAnalysisLoading && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">
                      Querying...
                    </span>
                  )}
                </div>

                {isAnalysisLoading ? (
                  <div className="p-3 bg-white/5 border border-border/50 rounded-md animate-pulse space-y-2">
                    <div className="h-3.5 w-full bg-white/10 rounded" />
                    <div className="h-3.5 w-5/6 bg-white/10 rounded" />
                  </div>
                ) : analysis ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed bg-card border border-border/40 p-3 rounded">
                      {analysis.executiveSummary}
                    </p>
                    {analysis.recommendedActions?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                          Recommended Mitigations
                        </span>
                        <div className="flex flex-col gap-1">
                          {analysis.recommendedActions.slice(0, 3).map((act, idx) => (
                            <div
                              key={idx}
                              className="flex gap-1.5 items-start text-xs text-muted-foreground"
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No AI report cached for this alert.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MitrePage() {
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts({ limit: 100 });
  const [selectedTech, setSelectedTech] = useState<any | undefined>(undefined);

  // Group alerts into Matrix columns dynamically
  const matrixData = useMemo(() => {
    const tacticsMap: Record<
      string,
      {
        tactic: string;
        techniques: Map<string, { id: string; name: string; hits: number; alerts: any[] }>;
      }
    > = {};

    MITRE_TEMPLATE.forEach((t) => {
      const techMap = new Map();
      t.techniques.forEach((tech) => {
        techMap.set(tech.id, { id: tech.id, name: tech.name, hits: 0, alerts: [] });
      });
      tacticsMap[t.tactic] = { tactic: t.tactic, techniques: techMap };
    });

    const allTactics = [
      "Initial Access",
      "Execution",
      "Persistence",
      "Privilege Escalation",
      "Defense Evasion",
      "Credential Access",
      "Discovery",
      "Lateral Movement",
      "Exfiltration",
      "Impact",
    ];
    allTactics.forEach((t) => {
      if (!tacticsMap[t]) {
        tacticsMap[t] = { tactic: t, techniques: new Map() };
      }
    });

    // Populate hits and link alerts
    alerts.forEach((a) => {
      const tid = a.techniqueId;
      if (!tid || tid === "-") return;

      const tacticName =
        TECHNIQUE_TO_TACTIC[tid] || TECHNIQUE_TO_TACTIC[tid.split(".")[0]] || "Discovery";

      let tCol = tacticsMap[tacticName];
      if (!tCol) {
        tCol = tacticsMap["Discovery"];
      }

      let techNode = tCol.techniques.get(tid);
      if (!techNode) {
        techNode = {
          id: tid,
          name: a.technique || "Unknown Technique",
          hits: 0,
          alerts: [],
        };
        tCol.techniques.set(tid, techNode);
      }

      techNode.hits += 1;
      techNode.alerts.push(a);
    });

    return Object.values(tacticsMap).map((tCol) => {
      const techniquesArr = Array.from(tCol.techniques.values());
      const totalHits = techniquesArr.reduce((sum, tech) => sum + tech.hits, 0);
      return {
        tactic: tCol.tactic,
        totalHits,
        techniques: techniquesArr,
      };
    });
  }, [alerts]);

  const totalDetections = useMemo(() => {
    return matrixData.reduce((sum, t) => sum + t.totalHits, 0);
  }, [matrixData]);

  return (
    <>
      <Topbar
        title="MITRE ATT&CK Coverage"
        subtitle={`${totalDetections} detections mapped across ${matrixData.length} tactics`}
      />
      <main className="p-6 space-y-4">
        <Card>
          <CardHeader
            title="ATT&CK Matrix — Enterprise"
            subtitle="Heatmap by technique hits (last 7d)"
            right={
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Low</span>
                <span className="h-2 w-6 rounded bg-low/40" />
                <span className="h-2 w-6 rounded bg-medium/40" />
                <span className="h-2 w-6 rounded bg-high/40" />
                <span className="h-2 w-6 rounded bg-critical/40" />
                <span className="text-muted-foreground">High</span>
              </div>
            }
          />
          <div className="p-4 overflow-auto">
            {isLoading ? (
              <MitreMatrixSkeleton />
            ) : isError ? (
              <ErrorBlock
                message="Failed to load MITRE ATT&CK matrix from backend API"
                onRetry={refetch}
              />
            ) : (
              <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-2 min-w-max">
                {matrixData.map((t) => (
                  <div key={t.tactic} className="flex flex-col gap-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/90 px-2 py-1 border-b border-border">
                      {t.tactic}
                      <span className="ml-2 text-muted-foreground font-normal normal-case">
                        ({t.totalHits})
                      </span>
                    </div>
                    {t.techniques.map((tech) => (
                      <div
                        key={tech.id}
                        onClick={() => {
                          if (tech.hits > 0) setSelectedTech(tech);
                        }}
                        className={`rounded-md border p-2 text-xs transition-all ${
                          tech.hits > 0 ? "cursor-pointer" : "opacity-40 cursor-default"
                        } ${heat(tech.hits)}`}
                      >
                        <div className="font-mono text-[10px] opacity-80">{tech.id}</div>
                        <div className="font-medium text-foreground">{tech.name}</div>
                        <div className="mt-1 text-[10px] opacity-90">{tech.hits} hits</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Technique Drawer Details */}
      <TechniqueDetailsDrawer
        tech={selectedTech}
        open={selectedTech !== undefined}
        onClose={() => setSelectedTech(undefined)}
      />
    </>
  );
}
