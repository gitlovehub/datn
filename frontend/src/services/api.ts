import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";

// Vite proxy serves /api locally. The production nginx also proxies /api to Laravel.
// For a distinct deployment, set VITE_API_BASE_URL to an HTTPS API origin ending in /api.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type ApiErrorBody = { message?: string; errors?: Record<string, string[]> };
export class ApiClientError extends Error {
  readonly status: number;
  readonly data: ApiErrorBody | null;
  constructor(message: string, status: number, data: ApiErrorBody | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token && token !== "session_authenticated") config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data ?? null;
    const validation = data?.errors && Object.values(data.errors).flat()[0];
    const message = validation || data?.message || (status === 0 ? "Không thể kết nối tới máy chủ." : "Có lỗi khi xử lý yêu cầu.");
    // Backend enforces role/ownership; 401 invalidates the cached session.
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("isLoggedIn");
      window.dispatchEvent(new Event("user-updated"));
    }
    return Promise.reject(new ApiClientError(message, status, data));
  },
);

/** Compatible adapter for existing modules using fetchApi(endpoint, RequestInit). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Chữ ký tương thích với các module cũ chưa khai báo DTO.
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const method = options.method || "GET";
  let data: unknown = options.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { /* Allow ordinary text payloads. */ }
  }
  const headers: Record<string, string> = {};
  new Headers(options.headers).forEach((value, key) => { headers[key] = value; });
  const config: AxiosRequestConfig = { url: path, method, data, headers, signal: options.signal ?? undefined };
  const response = await apiClient.request<T>(config);
  return response.data;
}

/**
 * Khóa chống ghi trùng cho thao tác tạo dữ liệu (đặt lịch, thu tiền...).
 * Dùng cùng một khóa khi gửi lại cùng thao tác; backend trả lại kết quả cũ thay vì tạo bản ghi mới.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
