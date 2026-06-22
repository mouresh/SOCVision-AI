import { Search, Bell, Globe, ShieldAlert } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 flex items-center gap-4 px-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="hidden lg:flex items-center gap-2 w-96 rounded-md border border-border bg-card/60 px-3 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search alerts, hosts, users, IOCs…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/70"
        />
        <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card/60 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-muted-foreground">Threat level</span>
          <span className="text-high font-medium">Elevated</span>
        </div>
        <button className="relative p-2 rounded-md hover:bg-white/5">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-critical" />
        </button>
        <button className="p-2 rounded-md hover:bg-white/5">
          <Globe className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-info grid place-items-center text-xs font-bold text-primary-foreground">
            AR
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-medium">Alex Rivera</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Tier 3 Analyst
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
