import { fetchApi } from "./api";
import { getAdvisorAppointment, getAdvisorAppointments, confirmAdvisorAppointment, checkInAdvisorAppointment } from "./advisorAppointmentService";

/** Laravel responses in backend/routes/api.php, RepairOrderController and AdvisorAppointmentController. */
export type AppointmentWorkflowStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED";
export type WorkflowAppointment = {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: AppointmentWorkflowStatus;
  customer_id?: number | null;
  vehicle_id?: number | null;
  customer?: { id: number; full_name?: string; phone?: string } | null;
  vehicle?: { id: number; license_plate?: string; variant?: string } | null;
  symptom_description?: string | null;
  note?: string | null;
};
export type WorkflowInspection = {
  id: number; diagnosis?: string | null; condition_description?: string | null; inspected_at?: string | null;
  recorded_by?: { id: number; full_name?: string } | null;
  technician?: { id: number; employee?: { full_name?: string } | null } | null;
  items?: Array<{ id: number; item_name: string; condition_status?: string | null; note?: string | null }>;
  recommendations?: Array<{
    id: number; item_type?: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null; quantity?: number; note?: string | null;
    service?: { id: number; name?: string; base_price?: string | number | null } | null;
    part?: { id: number; name?: string; sell_price?: string | number | null } | null;
  }>;
};
export type Money = string | number | null | undefined;
export type WorkflowQuotationItem = {
  id: number; item_type: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null;
  description?: string | null; quantity: number; unit_price: Money; amount: Money; is_approved?: boolean | null;
};
export type WorkflowQuotation = {
  id: number; quotation_code?: string; version?: number; status: string;
  subtotal?: Money; discount_amount?: Money; total_amount?: Money; items?: WorkflowQuotationItem[];
};
export type WorkflowWorkItem = {
  id: number; description?: string | null; status: string; service?: { name?: string } | null;
  technician?: { id?: number; employee?: { full_name?: string } | null } | null;
};
export type WorkflowUsedPart = { id: number; part_id: number; quantity: number; unit_price: Money; part?: { name?: string; unit?: string } | null };
export type WorkflowPayment = { id: number; amount: Money; payment_method: string; status: string; paid_at?: string | null };
export type WorkflowInvoice = {
  id: number; invoice_code?: string; status: string; subtotal?: Money; discount_amount?: Money; total_amount?: Money;
  items?: Array<{ id: number; description?: string | null; quantity: number; unit_price: Money; amount: Money }>;
  payments?: WorkflowPayment[];
};
export type WorkflowOrder = {
  id: number;
  appointment_id?: number | null;
  repair_order_code?: string;
  status: string;
  customer_id?: number;
  vehicle_id?: number;
  mileage_received?: number | null;
  initial_condition?: string | null;
  note?: string | null;
  received_at?: string | null;
  customer?: { id?: number; full_name?: string; phone?: string } | null;
  vehicle?: { id?: number; license_plate?: string; variant?: string } | null;
  advisor?: { id?: number; full_name?: string } | null;
  assignments?: Array<{ id: number; technician_id: number; status?: string; technician?: { employee?: { full_name?: string } } }>;
  inspections?: WorkflowInspection[];
  status_history?: Array<{ id: number; status?: string; note?: string | null; created_at?: string }>;
  quotations?: WorkflowQuotation[];
  work_items?: WorkflowWorkItem[];
  used_parts?: WorkflowUsedPart[];
  invoice?: WorkflowInvoice | null;
  quality_checks?: Array<{ id: number; result: "PASSED" | "FAILED"; note?: string | null; checked_at?: string; checked_by?: { full_name?: string } | null }>;
  handed_over_to_name?: string | null;
  handed_over_to_phone?: string | null;
  handover_note?: string | null;
};
export type WorkflowPage<T> = { data: T[]; current_page: number; last_page: number; total: number };
export type ReceivePayload = {
  appointment_id: number;
  customer_id: number;
  vehicle_id: number;
  mileage_received?: number;
  initial_condition?: string;
  note?: string;
};

export async function advisorAppointment(id: number): Promise<WorkflowAppointment> {
  const response = await getAdvisorAppointment(id) as { data: WorkflowAppointment };
  if (!response?.data) throw new Error("API không trả thông tin lịch hẹn.");
  return response.data;
}

/** Index is pagination-based; do not silently assume a single page contains every matching order. */
export async function listWorkflowOrders(page = 1, status = ""): Promise<WorkflowPage<WorkflowOrder>> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  return fetchApi<WorkflowPage<WorkflowOrder>>(`/repair-orders?${params}`);
}

export async function findOrderForAppointment(appointmentId: number): Promise<WorkflowOrder | null> {
  let page = 1;
  for (;;) {
    const result = await listWorkflowOrders(page);
    const found = result.data.find(order => Number(order.appointment_id) === appointmentId);
    if (found) return found;
    if (page >= result.last_page) return null;
    // Fail closed rather than assuming there is no existing order in an unsearched page.
    if (page >= 100) throw new Error("Có quá nhiều trang phiếu để kiểm tra trùng. Liên hệ quản trị trước khi tạo phiếu.");
    page++;
  }
}

export async function listReceptionAppointments(status: AppointmentWorkflowStatus): Promise<WorkflowAppointment[]> {
  const result: WorkflowAppointment[] = [];
  let page = 1;
  for (;;) {
    const response = await getAdvisorAppointments({ status, page, per_page: 100 }) as {
      data: WorkflowAppointment[]; pagination: { last_page: number };
    };
    result.push(...(response.data || []));
    if (page >= (response.pagination?.last_page ?? 1)) return result;
    if (page >= 30) throw new Error("Danh sách lịch quá dài; hãy lọc lại theo ngày trong trang Lịch hẹn.");
    page++;
  }
}

/** Must be confirmed before check-in; Backend validates the transition. */
export async function checkInConfirmedAppointment(id: number): Promise<WorkflowAppointment> {
  const appointment = await advisorAppointment(id);
  if (appointment.status === "CHECKED_IN") return appointment;
  if (appointment.status !== "CONFIRMED") {
    throw new Error("Cần xác nhận lịch hẹn trước khi tiếp nhận xe.");
  }
  await checkInAdvisorAppointment(id);
  return advisorAppointment(id);
}

export async function confirmPendingAppointment(id: number): Promise<WorkflowAppointment> {
  const appointment = await advisorAppointment(id);
  if (appointment.status !== "PENDING") throw new Error("Chỉ xác nhận được lịch đang PENDING.");
  await confirmAdvisorAppointment(id);
  return advisorAppointment(id);
}

/** One appointment maps to one order (also backed by a UNIQUE DB constraint). */
export async function receiveRepairOrder(data: ReceivePayload): Promise<{ order: WorkflowOrder; existing: boolean }> {
  const appointment = await advisorAppointment(data.appointment_id);
  if (appointment.status !== "CHECKED_IN") throw new Error("Lịch chưa được tiếp nhận (CHECKED_IN).");
  const actualCustomer = appointment.customer?.id ?? appointment.customer_id;
  const actualVehicle = appointment.vehicle?.id ?? appointment.vehicle_id;
  if (!actualCustomer || !actualVehicle) throw new Error("Lịch thiếu khách hàng hoặc xe. Không thể tạo phiếu.");
  if (data.customer_id !== actualCustomer || data.vehicle_id !== actualVehicle) throw new Error("Thông tin xe/khách không khớp lịch hẹn.");
  const old = await findOrderForAppointment(appointment.id);
  if (old) return { order: old, existing: true };
  try {
    const order = await fetchApi<WorkflowOrder>("/repair-orders", {
      method: "POST", body: JSON.stringify(data),
    });
    return { order, existing: false };
  } catch (error) {
    // Network timeout/DB unique conflict may mean the first request was committed.
    try {
      const recovered = await findOrderForAppointment(appointment.id);
      if (recovered) return { order: recovered, existing: true };
    } catch { /* Preserve the original API error. */ }
    throw error;
  }
}

export type CatalogService = { id: number; name: string; category?: string | null; base_price?: Money };
export type CatalogPart = { id: number; sku: string; name: string; unit?: string | null; sell_price?: Money; inventory?: { quantity: number } | null };
export type QuotationLineInput = {
  item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; description?: string; quantity: number; unit_price?: number;
};
export function latestQuotation(order: { quotations?: WorkflowQuotation[] }): WorkflowQuotation | null {
  return [...(order.quotations ?? [])].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null;
}
/** Laravel decimal columns arrive as strings ("450000.00"). */
export function toNumber(value: Money): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
export function formatVnd(value: Money): string {
  return `${toNumber(value).toLocaleString("vi-VN")} ₫`;
}

export type InspectionResult = "PASSED" | "WARNING" | "FAILED";
export type RecommendationInput = { item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; quantity: number; note?: string };
export type InspectionInput = {
  technician_id?: number; condition_description?: string; diagnosis?: string;
  inspection_items: Array<{ item_name: string; status: InspectionResult; condition_description?: string }>;
  recommendations?: RecommendationInput[];
};

export type TechnicianOption = {
  id: number;
  specialty?: string | null;
  level?: string | null;
  is_available?: boolean;
  active_assignments_count?: number;
  employee?: { id: number; full_name?: string; phone?: string } | null;
};

export const workflowApi = {
  order: (id: number) => fetchApi<WorkflowOrder>(`/repair-orders/${id}`),
  technicians: () => fetchApi<TechnicianOption[]>("/technicians"),
  services: () => fetchApi<CatalogService[]>("/services"),
  parts: () => fetchApi<CatalogPart[]>("/parts"),
  createQuotation: (id: number, payload: { discount_amount?: number; items: QuotationLineInput[] }) =>
    fetchApi<WorkflowQuotation>(`/repair-orders/${id}/quotations`, { method: "POST", body: JSON.stringify(payload) }),
  sendQuotation: (quotationId: number) => fetchApi<WorkflowQuotation>(`/quotations/${quotationId}/send`, { method: "POST" }),
  respondQuotation: (quotationId: number, responses: Array<{ item_id: number; is_approved: boolean }>) =>
    fetchApi<WorkflowQuotation>(`/quotations/${quotationId}/respond`, { method: "POST", body: JSON.stringify({ responses }) }),
  transition: (id: number, step: "start-repair" | "waiting-for-parts" | "resume" | "complete", note?: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/${step}`, { method: "POST", body: JSON.stringify(note ? { note } : {}) }),
  close: (id: number, closeReason: string, note: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/close`, { method: "POST", body: JSON.stringify({ close_reason: closeReason, note }) }),
  recordInspection: (id: number, payload: InspectionInput) =>
    fetchApi<WorkflowInspection>(`/repair-orders/${id}/inspections`, { method: "POST", body: JSON.stringify(payload) }),
  addRecommendation: (id: number, payload: RecommendationInput) =>
    fetchApi(`/repair-orders/${id}/inspections/recommendations`, { method: "POST", body: JSON.stringify(payload) }),
  completeInspection: (id: number) => fetchApi<WorkflowInspection>(`/repair-orders/${id}/inspections/complete`, { method: "POST" }),
  assignWorkItemTechnician: (workItemId: number, technicianId: number, reason?: string) =>
    fetchApi(`/work-items/${workItemId}/technician`, { method: "PATCH", body: JSON.stringify({ technician_id: technicianId, ...(reason ? { reason } : {}) }) }),
  updateWorkItem: (workItemId: number, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") =>
    fetchApi(`/work-items/${workItemId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  recordUsedPart: (id: number, payload: { part_id: number; quantity: number; work_item_id?: number }) =>
    fetchApi<WorkflowUsedPart>(`/repair-orders/${id}/used-parts`, { method: "POST", body: JSON.stringify(payload) }),
  qualityCheck: (id: number, payload: { result: "PASSED" | "FAILED"; note?: string; rework_item_ids?: number[] }) =>
    fetchApi(`/repair-orders/${id}/review`, { method: "POST", body: JSON.stringify(payload) }),
  handOver: (id: number, payload: { receiver_name: string; receiver_phone?: string; note?: string }) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/hand-over`, { method: "POST", body: JSON.stringify(payload) }),
  createInvoice: (id: number) => fetchApi<WorkflowInvoice>(`/repair-orders/${id}/invoice`, { method: "POST" }),
  payCash: (invoiceId: number, amount: number, idempotencyKey: string) =>
    fetchApi<WorkflowPayment>(`/invoices/${invoiceId}/payments`, {
      method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ payment_method: "DIRECT", amount }),
    }),
  assignTechnician: (id: number, technicianId: number, note?: string) => fetchApi(`/repair-orders/${id}/assign-technician`, {
    method: "POST", body: JSON.stringify({ technician_id: technicianId, note: note || null }),
  }),
};
