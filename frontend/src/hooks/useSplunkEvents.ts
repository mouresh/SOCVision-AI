import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/api";

export interface MappedSplunkEvent {
  _time: string;
  index: string;
  sourcetype: string;
  host: string;
  event: string;
  srcIp?: string;
  destIp?: string;
  user?: string;
  eventCode?: string;
}

interface BackendSplunkEvent {
  time: string;
  raw: string;
  host: string;
  source: string;
  sourcetype: string;
  eventCode: string;
  eventCodeDescription: string;
  user: string;
  srcIp?: string;
  destIp?: string;
  processName?: string;
  commandLine?: string;
  fields: Record<string, any>;
}

export function mapBackendSplunkEventToFrontend(e: BackendSplunkEvent): MappedSplunkEvent {
  return {
    _time: e.time,
    index: e.source,
    sourcetype: e.sourcetype,
    host: e.host,
    event: e.raw || e.eventCodeDescription || "Security event log",
    srcIp: e.srcIp || e.fields?.IpAddress || e.fields?.src_ip || undefined,
    destIp: e.destIp || e.fields?.dest_ip || undefined,
    user: e.user || e.fields?.TargetUserName || undefined,
    eventCode: e.eventCode || undefined,
  };
}

export function useSplunkEvents(options?: {
  query?: string;
  type?: "brute_force" | "privilege_escalation" | "powershell" | "recent";
  limit?: number;
  offset?: number;
  earliestTime?: string;
  latestTime?: string;
  ingest?: boolean;
}) {
  return useQuery<MappedSplunkEvent[]>({
    queryKey: ["splunkEvents", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.query) params.append("query", options.query);
      if (options?.type) params.append("type", options.type);
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());
      if (options?.earliestTime) params.append("earliestTime", options.earliestTime);
      if (options?.latestTime) params.append("latestTime", options.latestTime);
      if (options?.ingest !== undefined) params.append("ingest", options.ingest.toString());

      const data = await api.get<BackendSplunkEvent[]>(`/splunk/events?${params.toString()}`);
      return data.map(mapBackendSplunkEventToFrontend);
    },
    retry: 2,
    refetchInterval: 20000, // Poll every 20s
  });
}
