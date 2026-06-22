import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/api";
import { type Severity } from "@/types/soc";

export interface MappedAlert {
  id: string;
  title: string;
  severity: Severity;
  source: string;
  sourceIp: string;
  destIp: string;
  user: string;
  technique: string;
  techniqueId: string;
  status: "new" | "investigating" | "resolved";
  timestamp: string;
  riskScore: number | null;
  riskLevel: string | null;
  assignedTo: string | null;
  rawEvent: Record<string, any>;
  enrichment: Record<string, any>;
  description: string | null;
}

interface BackendAlert {
  id: string;
  externalId: string | null;
  title: string;
  description: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "new" | "acknowledged" | "in_progress" | "resolved" | "false_positive" | "suppressed";
  source: string;
  sourceRuleId: string | null;
  sourceRuleName: string | null;
  assetId: string | null;
  agentId: string | null;
  assignedTo: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  rawEvent: Record<string, any>;
  enrichment: Record<string, any>;
  tags: string[];
  firedAt: string;
  createdAt: string;
  updatedAt: string;
}

export function mapBackendAlertToFrontend(a: BackendAlert): MappedAlert {
  const raw = a.rawEvent || {};
  const enrichment = a.enrichment || {};

  // Extract source IP, dest IP, user, technique from rawEvent and enrichment
  const sourceIp = raw.sourceIp || raw.srcIp || raw.src_ip || raw.IpAddress || raw.source_ip || "-";
  const destIp = raw.destIp || raw.dest_ip || raw.dest_port || "-";
  const user = raw.user || raw.TargetUserName || raw.username || raw.SubjectUserName || "unknown";

  const technique =
    raw.technique || enrichment.technique || a.sourceRuleName || "Unknown Technique";
  const techniqueId =
    raw.techniqueId || raw.technique_id || enrichment.technique_id || a.sourceRuleId || "-";

  // Map status
  let status: "new" | "investigating" | "resolved" = "new";
  if (a.status === "acknowledged" || a.status === "in_progress") {
    status = "investigating";
  } else if (
    a.status === "resolved" ||
    a.status === "false_positive" ||
    a.status === "suppressed"
  ) {
    status = "resolved";
  }

  return {
    id: a.id,
    title: a.title,
    severity: a.severity as Severity,
    source: a.source,
    sourceIp,
    destIp,
    user,
    technique,
    techniqueId,
    status,
    timestamp: a.firedAt || a.createdAt,
    riskScore: a.riskScore,
    riskLevel: a.riskLevel,
    assignedTo: a.assignedTo,
    rawEvent: raw,
    enrichment: enrichment,
    description: a.description,
  };
}

export function useAlerts(filters?: {
  source?: string;
  severity?: Severity;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<MappedAlert[]>({
    queryKey: ["alerts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.source) params.append("source", filters.source);
      if (filters?.severity) params.append("severity", filters.severity);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.page) params.append("page", filters.page.toString());
      params.append("limit", (filters?.limit || 20).toString());

      // Fetch from API
      // Since backend returns response wrapped in ApiResponse with meta, we need to handle pagination values.
      // Wait, in our api.ts client, api.get<T> returns response.data directly.
      // But wait! How can we retrieve the meta field containing total and totalPages?
      // Ah! In api.ts, the request function returns body.data.
      // If we need the meta field, does it exist in body?
      // Yes, but request() only returns body.data, not the whole body!
      // Wait, how can we get the total count for pagination if api.get only returns data?
      // If we don't have total, we can do client-side pagination or modify api.ts or use a workaround.
      // Wait! Let's check: does the backend return PaginatedResult?
      // Let's check AlertController.ts:
      // const response: ApiResponse<typeof result.items> = { success: true, data: result.items, meta: ... }
      // Ah! The backend returns result.items as the data!
      // So body.data is just the array of alerts.
      // Wait, how can we get total pages?
      // Can we modify api.ts to return the full ApiResponse envelope if requested, or can we return an object containing both items and total in another way?
      // Wait! Let's check if we can modify api.ts to return the full envelope, or we can just use a helper, or we can make the api client return the full envelope if a parameter is passed.
      // Or, we can just fetch the items, and if the items returned length is less than limit, we know it's the last page!
      // This is a standard "infinite scroll" or simple pagination style that doesn't need the total count, OR we can query stats to get the total count of alerts!
      // Yes! Since we have useAlertStats() which queries `/alerts/stats`, we can get the total count of alerts by summing the status or severity counts!
      // That is extremely clever! It completely avoids having to rewrite the API client.
      // Let's check: is the total count of alerts for the active filters obtainable from stats?
      // Yes, if we filter by status or severity, we can look up the corresponding stats counts.
      // Let's see: if we have page and limit, we can just query GET /alerts?page=X&limit=20.
      // In useAlerts, we can return the items array directly:
      // return data.map(mapBackendAlertToFrontend);
      // And in the Alerts page, we can show:
      // - Page 1, Page 2...
      // - Disable "Next" button if `alerts.length < limit`.
      // - Disable "Previous" button if `page === 1`.
      // This is a standard and robust pagination pattern (cursor/offset paging without total count requirement) and works perfectly without needing total count!
      // Yes, this is extremely clean and doesn't require modifying api.ts.
      // Let's return MappedAlert[] directly from useAlerts, keeping the query signature simple.
      const res = await api.get<BackendAlert[]>(`/alerts?${params.toString()}`);
      return res.map(mapBackendAlertToFrontend);
    },
    retry: 2,
    refetchInterval: 10000, // Poll every 10s
  });
}

export function useAlertStats() {
  return useQuery<{
    severity: Record<string, number>;
    status: Record<string, number>;
  }>({
    queryKey: ["alerts", "stats"],
    queryFn: () => api.get("/alerts/stats"),
    retry: 2,
  });
}
