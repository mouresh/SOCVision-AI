import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/api";
import { type Severity } from "@/types/soc";
export type { Severity };

export interface MappedIncident {
  id: string;
  uuid: string;
  title: string;
  severity: Severity;
  status: "open" | "in_progress" | "contained" | "closed";
  owner: string;
  alerts: number;
  created: string;
  description: string;
}

interface BackendIncident {
  id: string;
  incidentNumber: number;
  title: string;
  description: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
  priority: number;
  assignedAnalyst: string | null;
  createdBy: string | null;
  assignedTeam: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (isNaN(seconds) || seconds < 0) return "recently";

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval}y ago`;

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval}mo ago`;

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;

  return "just now";
}

export function mapBackendIncidentToFrontend(i: BackendIncident): MappedIncident {
  // Map status
  let status: MappedIncident["status"] = "open";
  if (i.status === "INVESTIGATING") {
    status = "in_progress";
  } else if (i.status === "RESOLVED") {
    status = "contained";
  } else if (i.status === "CLOSED") {
    status = "closed";
  }

  // Count linked alerts
  let alertCount = 0;
  if (i.metadata?.alertIds && Array.isArray(i.metadata.alertIds)) {
    alertCount = i.metadata.alertIds.length;
  } else if (i.metadata?.source_alert_id) {
    alertCount = 1;
  } else if (typeof i.metadata?.alert_count === "number") {
    alertCount = i.metadata.alert_count;
  } else {
    // default to 1 for fallback / visual purposes if it's an incident
    alertCount = 1;
  }

  return {
    id: `INC-${i.incidentNumber || i.id.slice(0, 4)}`,
    uuid: i.id,
    title: i.title,
    severity: i.severity as Severity,
    status,
    owner: i.assignedAnalyst || "Unassigned",
    alerts: alertCount,
    created: formatRelativeTime(i.createdAt),
    description: i.description || "",
  };
}

export function useIncidents(filters?: {
  status?: string;
  severity?: Severity;
  search?: string;
  limit?: number;
}) {
  return useQuery<MappedIncident[]>({
    queryKey: ["incidents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) {
        let backendStatus = filters.status;
        if (filters.status === "open") backendStatus = "OPEN";
        else if (filters.status === "in_progress") backendStatus = "INVESTIGATING";
        else if (filters.status === "contained") backendStatus = "RESOLVED";
        else if (filters.status === "closed") backendStatus = "CLOSED";
        params.append("status", backendStatus);
      }
      if (filters?.severity) params.append("severity", filters.severity);
      if (filters?.search) params.append("search", filters.search);
      params.append("limit", (filters?.limit || 100).toString());

      const data = await api.get<BackendIncident[]>(`/incidents?${params.toString()}`);
      return data.map(mapBackendIncidentToFrontend);
    },
    retry: 2,
    refetchInterval: 15000, // Poll every 15s
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface MappedComment {
  id: string;
  incidentId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IncidentDetails {
  incident: MappedIncident & {
    metadata: Record<string, any>;
    priority: number;
    rawIncident: BackendIncident;
  };
  comments: MappedComment[];
  alertIds: string[];
}

interface BackendComment {
  id: string;
  incident_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export function useIncidentDetails(incidentId: string | undefined) {
  return useQuery<IncidentDetails | null>({
    queryKey: ["incidentDetails", incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      const data = await api.get<{
        incident: BackendIncident;
        comments: BackendComment[];
        alertIds: string[];
      }>(`/incidents/${incidentId}`);

      const mappedComments: MappedComment[] = (data.comments || []).map((c) => ({
        id: c.id,
        incidentId: c.incident_id,
        authorId: c.author_id,
        body: c.body,
        isInternal: c.is_internal,
        createdAt: c.created_at,
      }));

      return {
        incident: {
          ...mapBackendIncidentToFrontend(data.incident),
          metadata: data.incident.metadata || {},
          priority: data.incident.priority,
          rawIncident: data.incident,
        },
        comments: mappedComments,
        alertIds: data.alertIds || [],
      };
    },
    enabled: !!incidentId,
    retry: 2,
  });
}

export function useAddIncidentComment() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    { incidentId: string; body: string; authorId: string; isInternal?: boolean }
  >({
    mutationFn: async ({ incidentId, body, authorId, isInternal = true }) => {
      return api.post(`/incidents/${incidentId}/comment`, {
        body,
        authorId,
        isInternal,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incidentDetails", variables.incidentId] });
    },
  });
}
