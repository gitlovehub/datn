import { fetchApi } from "./api";

/** GET /dashboard/summary — số liệu tính trực tiếp từ DB; cách tính nằm trong `definitions`. */
export type DashboardSummary = {
  generated_at: string;
  period_days: number;
  appointments: { today: number; today_checked_in: number; today_waiting_arrival: number; pending: number; today_capacity: number };
  repair_orders: {
    in_garage: number; waiting_diagnosis: number; waiting_quotation: number; waiting_approval: number;
    in_progress: number; waiting_parts: number; waiting_payment: number; ready_for_pickup: number;
  };
  period: { appointments: number; cancel_rate: number; no_show_rate: number; revenue: number; handed_over: number };
  inventory: { low_stock: number };
  recent_orders: Array<{
    id: number; repair_order_code: string; status: string; updated_at: string;
    customer?: { full_name?: string } | null; vehicle?: { license_plate?: string | null } | null;
  }>;
  definitions: Record<string, string>;
};

export function getDashboardSummary(days = 30): Promise<DashboardSummary> {
  return fetchApi<DashboardSummary>(`/dashboard/summary?days=${days}`);
}
