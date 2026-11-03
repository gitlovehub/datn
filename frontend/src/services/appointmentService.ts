import { fetchApi } from "./api";
export type CustomerVehicle = {
  id: number;
  license_plate: string;
  variant?: string | null;
  year?: number | null;
  model?: {
    name?: string;
    brand?: {
      name?: string;
    } | null;
  } | null;
};
export type AppointmentService = {
  id: number;
  name: string;
  base_price?: number | string;
  estimated_minutes?: number;
};
export type CreateAppointmentData = {
  vehicle_id: number;
  appointment_date: string;
  appointment_time: string;
  request_type: "DIAGNOSIS" | "REPAIR" | "MAINTENANCE" | "REPLACEMENT";
  symptom_description?: string;
  note?: string;
  service_ids?: number[];
  package_ids?: number[];
};
export const getMyVehicles = async (): Promise<CustomerVehicle[]> => {
  const response = await fetchApi("/me/vehicles");
  return response.data ?? [];
};
export const getServices = async (): Promise<AppointmentService[]> => {
  const response = await fetchApi("/services");
  return Array.isArray(response) ? response : response.data ?? [];
};
export const createAppointment = async (data: CreateAppointmentData) => {
  return fetchApi("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
