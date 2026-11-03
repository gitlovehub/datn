import { fetchApi } from "./api";

export type AdvisorVehicle = {
  id: number;
  customer_id: number;
  model_id: number;
  license_plate: string | null;
  variant?: string | null;
  year?: number | null;
  mileage?: number | null;
  vin?: string | null;
  note?: string | null;
  customer?: {
    id?: number;
    full_name?: string;
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  model?: {
    id?: number;
    name?: string;
    brand?: {
      id?: number;
      name?: string;
    } | null;
  } | null;
};

export type AdvisorVehiclePage = {
  data: AdvisorVehicle[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type VehicleListResponse = {
  success?: boolean;
  message?: string;
  data?: {
    data?: AdvisorVehicle[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export async function getAdvisorVehicles(params: {
  search?: string;
  page?: number;
} = {}): Promise<AdvisorVehiclePage> {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  query.set("page", String(params.page ?? 1));

  const response = (await fetchApi(
    `/vehicles?${query.toString()}`,
  )) as VehicleListResponse;

  const result = response?.data;

  return {
    data: Array.isArray(result?.data) ? result.data : [],
    current_page: result?.current_page ?? 1,
    last_page: result?.last_page ?? 1,
    per_page: result?.per_page ?? 10,
    total: result?.total ?? 0,
  };
}

export async function deleteAdvisorVehicle(id: number): Promise<void> {
  await fetchApi(`/vehicles/${id}`, {
    method: "DELETE",
  });
}
export type AdvisorVehicleInput = {
  customer_id: number;
  model_id: number;
  license_plate?: string | null;
  variant?: string | null;
  year?: number | null;
  mileage?: number | null;
  vin?: string | null;
  note?: string | null;
};

export async function createAdvisorVehicle(
  data: AdvisorVehicleInput,
): Promise<AdvisorVehicle> {
  const response = await fetchApi("/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.data;
}

export async function updateAdvisorVehicle(
  id: number,
  data: Partial<AdvisorVehicleInput>,
): Promise<AdvisorVehicle> {
  const response = await fetchApi(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  return response.data;
}
