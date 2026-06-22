import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/soc/Sidebar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary text-glow">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Signal lost.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Return to SOC
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error("Global Error Boundary caught error:", error);
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col p-6 items-center justify-center">
        <div className="max-w-md text-center border border-destructive/20 bg-destructive/5 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-destructive flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            System Error Boundary
          </h1>
          <p className="mt-4 text-xs text-muted-foreground font-mono text-left bg-black/40 p-4 rounded overflow-auto max-h-48 whitespace-pre-wrap">
            {error.stack || error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex rounded-md bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/80 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SOCVision AI — Security Operations" },
      {
        name: "description",
        content:
          "Modern SOC platform with AI-powered triage, MITRE ATT&CK mapping, and real-time threat detection.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </div>
      </div>
    </QueryClientProvider>
  );
}
