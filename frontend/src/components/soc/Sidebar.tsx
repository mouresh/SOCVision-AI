import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShieldAlert,
  Siren,
  Brain,
  Crosshair,
  Network,
  FileText,
  ShieldCheck,
  Activity,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/ai-analyst", label: "AI Analyst", icon: Brain },
  { to: "/threat-hunting", label: "Threat Hunting", icon: Crosshair },
  { to: "/mitre", label: "MITRE ATT&CK", icon: Network },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="relative">
          <ShieldCheck className="h-7 w-7 text-primary text-glow" />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-success animate-pulse" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">
            SOCVision <span className="text-primary">AI</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Security ops
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-white/5 text-sidebar-foreground/80 hover:text-sidebar-foreground",
              ].join(" ")}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
              )}
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-md bg-card/60 border border-border p-3 text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">System status</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-success font-medium">All sensors online</span>
            <span className="text-muted-foreground">v2.4.1</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
