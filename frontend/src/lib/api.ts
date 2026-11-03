import axios from "axios";
import { ApiClientError, API_BASE_URL, fetchApi } from "../services/api";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Only for cookie-based Sanctum auth flows; bearer-token login does not require it. */
export async function initializeCsrfCookie(): Promise<void> {
  const origin = API_BASE_URL.startsWith("/") ? "" : new URL(API_BASE_URL).origin;
  try {
    await axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true });
  } catch (error) {
    throw new ApiError("Không thể khởi tạo phiên bảo mật.", axios.isAxiosError(error) ? error.response?.status ?? 0 : 0);
  }
}

/** Compatibility layer: old apiRequest users share the SAME Axios client and token. */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try { return await fetchApi<T>(path, options); }
  catch (error) {
    if (error instanceof ApiClientError) throw new ApiError(error.message, error.status);
    throw error;
  }
}
export function getApiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}
