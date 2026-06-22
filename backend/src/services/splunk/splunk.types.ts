export interface SplunkSearchOptions {
  earliestTime?: string | undefined; // e.g. "-24h", "-7d"
  latestTime?: string | undefined;   // e.g. "now"
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface SplunkEvent {
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

export interface SplunkPaginatedResult<T> {
  results: T[];
  count: number;
  offset: number;
  total?: number;
}
