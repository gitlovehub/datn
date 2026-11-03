import { fetchApi } from "./api";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CANCELLED" | "NO_SHOW";

export type GetAppointmentsParams = {
  page?: number;
  per_page?: number;
  status?: AppointmentStatus | "";
  date?: string;
  search?: string;
};

export const getAdvisorAppointments = async (
  params: GetAppointmentsParams = {}
) => {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.per_page) {
    searchParams.set("per_page", String(params.per_page));
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.date) {
    searchParams.set("date", params.date);
  }

  if (params.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();

  return fetchApi(
    `/advisor/appointments${query ? `?${query}` : ""}`
  );
};

export const getAdvisorAppointment = async (id: number) => {
  return fetchApi(`/advisor/appointments/${id}`);
};

export const confirmAdvisorAppointment = async (id: number) => {
  return fetchApi(`/advisor/appointments/${id}/confirm`, {
    method: "POST",
  });
};

export const checkInAdvisorAppointment = async (id: number) => {
  return fetchApi(`/advisor/appointments/${id}/check-in`, {
    method: "POST",
  });
};

export const cancelAdvisorAppointment = async (
  id: number,
  cancelReason: string
) => {
  return fetchApi(`/advisor/appointments/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      cancel_reason: cancelReason,
    }),
  });
};
export const markNoShowAdvisorAppointment = async (id: number) => {
  return fetchApi(`/advisor/appointments/${id}/no-show`, { method: "POST" });
};
