export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    count?: number;
  };
  timestamp: string;
  requestId: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://socvision-api.onrender.com/api/v1";

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let body: any;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      const errorMsg = body?.error?.message || response.statusText || "Request failed";
      const errorCode = body?.error?.code || "HTTP_ERROR";
      throw new ApiError(errorMsg, errorCode, response.status, body?.error?.details);
    }

    if (body && typeof body === "object" && "success" in body) {
      if (!body.success) {
        throw new ApiError(
          body.error?.message || "Operation unsuccessful",
          body.error?.code || "OPERATION_FAILED",
          response.status,
          body.error?.details,
        );
      }
      return body.data as T;
    }

    return body as T;
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      throw new ApiError("Request timed out", "TIMEOUT", 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network error", "NETWORK_ERROR", 0);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: any, options?: RequestOptions) => {
    const opts: RequestOptions = { ...options, method: "POST" };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return request<T>(path, opts);
  },
  put: <T>(path: string, body?: any, options?: RequestOptions) => {
    const opts: RequestOptions = { ...options, method: "PUT" };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    return request<T>(path, opts);
  },
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export default api;
