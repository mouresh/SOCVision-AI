import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import {
  Brain,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Bot,
  User,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Send,
} from "lucide-react";
import { Topbar } from "@/components/soc/Topbar";
import { Card, CardHeader, SeverityBadge } from "@/components/soc/ui";
import { useAlerts } from "@/hooks/useAlerts";
import { useAIAnalysis } from "@/hooks/useAIAnalysis";

export const Route = createFileRoute("/ai-analyst")({
  validateSearch: z.object({ alertId: z.string().optional() }),
  head: () => ({ meta: [{ title: "AI Analyst — SOCVision AI" }] }),
  component: AIAnalyst,
});

function QueueSkeleton() {
  return (
    <div className="divide-y divide-border animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3 space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-4 w-12 bg-white/15 rounded" />
          </div>
          <div className="h-4.5 w-3/4 bg-white/15 rounded" />
          <div className="h-3 w-1/2 bg-white/10 rounded" />
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

function AIAnalysisSkeleton() {
  return (
    <Card className="p-6 space-y-6 animate-pulse relative overflow-hidden">
      <style>{`
        @keyframes progress-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-progress-bar {
          animation: progress-bar 1.5s infinite linear;
        }
      `}</style>

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-white/10 rounded-full" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
        <div className="h-5 w-24 bg-white/15 rounded" />
      </div>

      <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
        <Brain className="h-12 w-12 text-primary animate-bounce mb-2" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Generating AI Analysis...</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Triage engine is processing event parameters, mapping techniques to MITRE database, and
            evaluating containment steps.
          </p>
        </div>
        <div className="w-48 h-1 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-1/3 bg-primary rounded animate-progress-bar" />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/40">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-20 bg-white/10 rounded" />
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AIAnalyst() {
  const { alertId: searchAlertId } = Route.useSearch();
  const navigate = Route.useNavigate();

  // Query live alerts queue
  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    refetch: refetchAlerts,
  } = useAlerts({ limit: 20 });

  const selectedAlert = useMemo(() => {
    if (!alerts.length) return undefined;
    if (searchAlertId) {
      return alerts.find((a) => a.id === searchAlertId) || alerts[0];
    }
    return alerts[0];
  }, [alerts, searchAlertId]);

  // Query AI analysis report dynamically
  const {
    data: analysis,
    isLoading: isAnalysisLoading,
    isError: isAnalysisError,
    refetch: refetchAnalysis,
  } = useAIAnalysis(selectedAlert?.id);

  // Ask the Analyst chat logs state
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "user", text: "What's the blast radius if we don't contain in the next hour?" },
    {
      role: "assistant",
      text: "Based on lateral-movement velocity (2.3 hosts/hr) and shared admin credentials in this VLAN, expected impact within 60 min is 5–7 endpoints, including one domain controller. Recommend immediate isolation.",
    },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInputText("");

    setTimeout(() => {
      let botResponse =
        "I am auditing additional logs to verify the scope of this alert. Based on similar alerts in the index, recommended action is host isolation.";
      if (userMsg.toLowerCase().includes("contain") || userMsg.toLowerCase().includes("isolate")) {
        botResponse =
          "Containment can be triggered via EDR isolation command. This will sever network communication except to the SIEM and EDR controllers.";
      } else if (
        userMsg.toLowerCase().includes("user") ||
        userMsg.toLowerCase().includes("account")
      ) {
        botResponse =
          "Credential exposure risk is high. Revoking active Microsoft Entra sessions and triggering a password reset on next logon is strongly advised.";
      }
      setMessages((prev) => [...prev, { role: "assistant", text: botResponse }]);
    }, 1000);
  };

  const handleSelectAlert = (id: string) => {
    navigate({ search: { alertId: id } });
  };

  return (
    <>
      <Topbar title="AI Security Analyst" subtitle="LLM-assisted triage, enrichment & response" />
      <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Side: Queue Panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader title="Queue" subtitle="Awaiting AI triage" />

          {isAlertsLoading ? (
            <QueueSkeleton />
          ) : isAlertsError ? (
            <div className="p-4">
              <ErrorBlock message="Failed to load alert queue" onRetry={refetchAlerts} />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs italic">
              No alerts found in queue.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[70vh] overflow-auto">
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelectAlert(a.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                    selectedAlert?.id === a.id ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {a.id.slice(0, 8)}...
                    </span>
                    <SeverityBadge s={a.severity} />
                  </div>
                  <div className="mt-1 text-sm font-medium truncate">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {a.source} · {a.user}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Right Side: Analysis View */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedAlert ? (
            <Card className="p-10 text-center text-muted-foreground italic text-sm">
              Please select an alert from the queue to start AI analysis.
            </Card>
          ) : (
            <>
              {/* Alert Details Card */}
              <Card>
                <div className="p-5 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate leading-snug">
                      {selectedAlert.title}
                    </h2>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs border-t border-border/40 pt-3">
                      <Meta k="Alert ID" v={selectedAlert.id.slice(0, 8) + "..."} mono />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Severity
                        </div>
                        <SeverityBadge s={selectedAlert.severity} />
                      </div>
                      <Meta k="Risk Score" v={selectedAlert.riskScore?.toString() ?? "N/A"} mono />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Risk Level
                        </div>
                        {selectedAlert.riskLevel ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedAlert.riskLevel === "CRITICAL"
                                ? "bg-critical/15 text-critical border border-critical/30"
                                : selectedAlert.riskLevel === "HIGH"
                                  ? "bg-high/15 text-high border-high/30"
                                  : selectedAlert.riskLevel === "MEDIUM"
                                    ? "bg-medium/15 text-medium border-medium/30"
                                    : "bg-success/15 text-success border-success/30"
                            }`}
                          >
                            {selectedAlert.riskLevel}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <Meta k="Source" v={selectedAlert.source} />
                      <Meta k="Timestamp" v={new Date(selectedAlert.timestamp).toLocaleString()} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* AI Report Card */}
              {isAnalysisLoading ? (
                <AIAnalysisSkeleton />
              ) : isAnalysisError ? (
                <ErrorBlock
                  message="Failed to load AI Analysis report from backend API"
                  onRetry={refetchAnalysis}
                />
              ) : !analysis ? (
                <Card className="p-8 text-center text-muted-foreground italic text-xs">
                  No AI Analysis report generated for this alert.
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title="AI Analysis"
                    subtitle={`GPT-powered triage & recommended actions · Model: ${analysis.model}`}
                    right={
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary border border-primary/20 bg-primary/10 px-2.5 py-0.5 rounded font-medium">
                        <Sparkles className="h-3 w-3" /> Confidence 94%
                      </span>
                    }
                  />
                  <div className="p-5 space-y-5 text-sm">
                    {/* Executive Summary */}
                    <Section
                      icon={<Bot className="h-4 w-4 text-primary" />}
                      title="Executive Summary"
                    >
                      <p className="text-muted-foreground leading-relaxed">
                        {analysis.executiveSummary}
                      </p>
                    </Section>

                    {/* Risk Assessment */}
                    <Section
                      icon={<Brain className="h-4 w-4 text-primary" />}
                      title="Risk Assessment"
                    >
                      <p className="text-muted-foreground leading-relaxed">
                        {analysis.riskExplanation}
                      </p>
                    </Section>

                    {/* MITRE ATT&CK Mapping */}
                    <Section
                      icon={<ShieldAlert className="h-4 w-4 text-primary" />}
                      title="MITRE ATT&CK Mapping"
                    >
                      <p className="text-muted-foreground leading-relaxed">
                        {analysis.mitreExplanation}
                      </p>
                      {analysis.mitreMappings?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {analysis.mitreMappings.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-border/80 text-xs font-mono"
                            >
                              <span className="font-bold text-primary">{m.techniqueId}</span>
                              <span className="text-muted-foreground">{m.techniqueName}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </Section>

                    {/* Recommended Actions */}
                    <Section
                      icon={<ArrowRight className="h-4 w-4 text-primary" />}
                      title="Recommended actions"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {analysis.recommendedActions.map((action, idx) => (
                          <button
                            key={idx}
                            className="text-left rounded-md border border-border bg-card/60 px-3.5 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <span className="text-foreground text-xs font-medium leading-relaxed">
                              {action}
                            </span>
                          </button>
                        ))}
                      </div>
                    </Section>
                  </div>
                </Card>
              )}

              {/* Follow up Ask analyst box */}
              <Card>
                <CardHeader title="Ask the analyst" />
                <div className="p-4 space-y-3">
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {messages.map((m, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        {m.role === "user" ? (
                          <>
                            <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1.5" />
                            <div className="rounded-md bg-card/60 border border-border px-3.5 py-2 text-sm leading-relaxed text-muted-foreground">
                              {m.text}
                            </div>
                          </>
                        ) : (
                          <>
                            <Bot className="h-5 w-5 text-primary shrink-0 mt-1.5" />
                            <div className="rounded-md bg-primary/10 border border-primary/30 px-3.5 py-2 text-sm leading-relaxed text-foreground">
                              {m.text}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-2">
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ask a follow-up…"
                      className="flex-1 bg-card/60 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 text-foreground"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 disabled:opacity-50 transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{k}</div>
      <div className={mono ? "font-mono text-foreground truncate" : "text-foreground truncate"}>
        {v}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/95">
          {title}
        </h4>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
