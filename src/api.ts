import type { LoginResponse } from "./types";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:8000")
).replace(/\/+$/, "");
const ACCESS_KEY = "smr-workshop-access";
const REFRESH_KEY = "smr-workshop-refresh";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getApiUrl(path: string) {
  if (!API_ORIGIN) {
    throw new Error("Backend URL is not configured. Set VITE_API_BASE_URL and restart the portal.");
  }
  return `${API_ORIGIN}/api/${path.replace(/^\/+/, "")}`;
}

function formatApiError(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatApiError).join(" ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (typeof record.error === "string") return record.error;
    return Object.entries(record)
      .map(([key, message]) => `${key.replaceAll("_", " ")}: ${formatApiError(message)}`)
      .join(" ");
  }
  return "The request could not be completed.";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(getApiUrl(path), { ...options, headers });
  const rawBody = await response.text();
  let body: unknown = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearSession();
      window.dispatchEvent(new Event("smr-session-expired"));
    }
    throw new ApiError(formatApiError(body), response.status);
  }
  return body as T;
}

export function saveSession(data: LoginResponse) {
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasSession() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

export const api = {
  registerWorkshop: (payload: FormData) =>
    request<{
      application_tracking_id: string;
      verification_status: string;
      submission_completeness: string;
      registration_date: string;
    }>("garages/register/", { method: "POST", body: payload }, false),
  login: async (username: string, password: string) => {
    const options = { method: "POST", body: JSON.stringify({ username, password }) };
    try {
      return await request<LoginResponse>("login/workshop/", options, false);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      return request<LoginResponse>("login/", options, false);
    }
  },
  setPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>(
      "auth/password-reset/confirm/",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          role: "WORKSHOP",
          code,
          new_password: newPassword,
        }),
      },
      false,
    ),
  requestPasswordCode: (email: string) =>
    request<{ message: string }>(
      "auth/password-reset/",
      { method: "POST", body: JSON.stringify({ email, role: "WORKSHOP" }) },
      false,
    ),
  getProfile: () => request<import("./types").GarageProfile>("garages/garage/profile/"),
  updateProfile: (payload: Partial<import("./types").GarageProfile>) =>
    request<import("./types").GarageProfile>("garages/garage/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getBookings: (search = "", status = "") => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    const suffix = query.toString();
    return request<import("./types").Booking[]>(
      `garages/garage/requests/${suffix ? `?${suffix}` : ""}`,
    );
  },
  getBooking: (id: number) =>
    request<import("./types").Booking>(`garages/garage/requests/${id}/`),
  submitQuote: (
    id: number,
    payload: {
      line_items: import("./types").QuoteDraft[];
      scheduled_date: string;
      scheduled_time: string | null;
    },
  ) =>
    request<import("./types").Booking>(`garages/garage/requests/${id}/quote/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  declineBooking: (id: number, reason: string) =>
    request<import("./types").Booking>(`garages/garage/requests/${id}/decline/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  startBooking: (id: number) =>
    request<import("./types").Booking>(`garages/garage/requests/${id}/start/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  completeBooking: (id: number) =>
    request<import("./types").Booking>(`garages/garage/requests/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getApplicationStatus: async (trackingId: string) => {
    try {
      return await request<import("./types").ApplicationStatus>(
        `garages/application-status/?tracking_id=${encodeURIComponent(trackingId)}`,
        {},
        false,
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      return request<import("./types").ApplicationStatus>(
        "garages/check-status/",
        {
          method: "POST",
          body: JSON.stringify({ application_tracking_id: trackingId }),
        },
        false,
      );
    }
  },
};
