export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
  "Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}
export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
}
export interface LeadListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface LeadListResponse {
  success: boolean;
  data: Lead[];
  meta: LeadListMeta;
}
export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
}
export interface LeadQuery {
  search?: string;
  status?: LeadStatus | "";
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "name" | "-name";
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fieldErrors = Array.isArray(body?.errors)
      ? body.errors.reduce(
          (
            acc: Record<string, string>,
            issue: { path: string; message: string },
          ) => {
            acc[issue.path] = issue.message;
            return acc;
          },
          {},
        )
      : undefined;
    throw new ApiError(
      body?.message ?? `Request failed with status ${response.status}`,
      response.status,
      fieldErrors,
    );
  }
  return body as T;
}

export function fetchLeads(query: LeadQuery = {}): Promise<LeadListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  const qs = params.toString();
  return request<LeadListResponse>(`/leads${qs ? `?${qs}` : ""}`);
}
export function fetchLeadStats(): Promise<{
  success: boolean;
  data: LeadStats;
}> {
  return request("/leads/stats");
}
export function createLead(
  input: LeadInput,
): Promise<{ success: boolean; data: Lead }> {
  return request("/leads", { method: "POST", body: JSON.stringify(input) });
}
export function updateLead(
  id: string,
  input: Partial<LeadInput>,
): Promise<{ success: boolean; data: Lead }> {
  return request(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ success: boolean; data: Lead }> {
  return request(`/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
export function deleteLead(id: string): Promise<{ success: boolean }> {
  return request(`/leads/${id}`, { method: "DELETE" });
}
