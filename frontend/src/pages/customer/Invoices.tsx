import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatDate,
  formatMoney,
  getMyRepairOrderDetail,
  getMyRepairOrders,
  getVehicleName,
  invoiceStatusLabel,
  type CustomerRepairOrder,
} from "../../services/customerApi";

type InvoiceRow = {
  order: CustomerRepairOrder;
  invoice: NonNullable<CustomerRepairOrder["invoice"]>;
};

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [selectedInvoiceRow, setSelectedInvoiceRow] = useState<InvoiceRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const orders = await getMyRepairOrders();
      const detailed = await Promise.all(
        orders.map(async (o) => {
          try {
            return await getMyRepairOrderDetail(o.id);
          } catch {
            return o;
          }
        }),
      );

      const list: InvoiceRow[] = [];
      detailed.forEach((order) => {
        if (order.invoice) {
          list.push({ order, invoice: order.invoice });
        }
      });

      // Sắp xếp hóa đơn mới nhất lên đầu
      list.sort((a, b) => b.invoice.id - a.invoice.id);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ invoice, order }) => {
      if (statusFilter !== "ALL" && invoice.status !== statusFilter) return false;
      if (!q) return true;
      return [
        invoice.invoice_code,
        order.repair_order_code,
        order.vehicle?.license_plate,
        getVehicleName(order.vehicle),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [rows, statusFilter, search]);

  const paidCount = rows.filter((r) => r.invoice.status === "PAID").length;
  const unpaidCount = rows.filter((r) =>
    ["UNPAID", "PARTIALLY_PAID"].includes(r.invoice.status),
  ).length;

  const totalSpent = rows
    .filter((r) => r.invoice.status === "PAID")
    .reduce((sum, r) => sum + Number(r.invoice.total_amount), 0);

  return (
    <div className="at-customer-invoices min-h-screen bg-[#F7F7F5] text-[#20252B]">

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-14">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / HÓA ĐƠN
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Hóa đơn của tôi
                </h1>
                <p className="mt-2 text-[13px] leading-6 text-[#66717C]">
                  Theo dõi các hóa đơn và lịch sử thanh toán dịch vụ của các xe.
                </p>
              </div>

              <div className="hidden rounded-xl border border-[#E1E4E6] bg-white px-4 py-3 sm:block">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                  TỔNG ĐÃ CHI TRẢ
                </p>
                <p className="mt-1 text-[14px] font-bold text-[#1F2933]">
                  {loading ? "…" : formatMoney(totalSpent)}
                </p>
              </div>
            </div>
          </div>

          {/* 3 THẺ KPI */}
          <div className="mb-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    TỔNG HÓA ĐƠN
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-[#20252B]">
                    {loading ? "…" : rows.length}
                  </p>
                  <p className="mt-1 text-xs text-[#66717C]">Hóa đơn phát hành</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                  HĐ
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    ĐÃ THANH TOÁN
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-700">
                    {loading ? "…" : paidCount}
                  </p>
                  <p className="mt-1 text-xs text-[#66717C]">Giao dịch hoàn tất</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-800">
                  ✓
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8A949E]">
                    CHƯA THANH TOÁN
                  </p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600">
                    {loading ? "…" : unpaidCount}
                  </p>
                  <p className="mt-1 text-xs text-[#66717C]">Cần thanh toán</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800">
                  !
                </div>
              </div>
            </div>
          </div>

          {/* DANH SÁCH HÓA ĐƠN */}
          <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#E1E4E6] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã hóa đơn, biển số xe..."
                  className="h-10 w-full sm:w-72 rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3.5 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-[#E1E4E6] bg-[#F7F7F5] px-3 text-xs outline-none transition focus:border-[#D6A85F] focus:bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="UNPAID">Chưa thanh toán</option>
                  <option value="PARTIALLY_PAID">Thanh toán một phần</option>
                </select>
              </div>

              <span className="rounded-full bg-[#F3F4F2] px-3 py-1.5 text-xs font-semibold text-[#66717C]">
                {filtered.length} hóa đơn
              </span>
            </div>

            {loading ? (
              <p className="p-10 text-center text-xs text-[#8A949E]">Đang tải danh sách hóa đơn...</p>
            ) : error ? (
              <div className="p-8 text-center text-xs text-red-600">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="cs-btn cs-btn-secondary cs-btn-sm mt-3"
                >
                  Thử lại
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-[#20252B]">Chưa có hóa đơn nào</p>
                <p className="mt-1 text-xs text-[#8A949E]">
                  Khi xe của bạn hoàn tất dịch vụ sửa chữa, hóa đơn sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-5">
                {filtered.map(({ invoice, order }) => {
                  const paid = (invoice.payments ?? [])
                    .filter((p) => p.status === "SUCCESS")
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                  const isPaid = invoice.status === "PAID";

                  return (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border border-[#E1E4E6] bg-[#FAFAF9] p-5 transition hover:border-[#D6A85F] hover:shadow-[0_8px_25px_rgba(31,41,51,0.05)]"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1F2933] text-xs font-bold text-white">
                            HĐ
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-[14px] font-bold text-[#20252B]">
                                {invoice.invoice_code}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isPaid
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isPaid ? "bg-emerald-500" : "bg-amber-500"
                                  }`}
                                />
                                {invoiceStatusLabel[invoice.status] ?? invoice.status}
                              </span>
                            </div>

                            <p className="mt-1.5 text-[13px] font-semibold text-[#20252B]">
                              {getVehicleName(order.vehicle)} ·{" "}
                              <span className="font-mono text-[#8F641B]">
                                {order.vehicle?.license_plate ?? "—"}
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-[#66717C]">
                              Phiếu dịch vụ: <strong>{order.repair_order_code}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5 border-t border-[#E1E4E6] pt-4 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                              Ngày lập
                            </p>
                            <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                              {formatDate(order.completed_at ?? order.received_at)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A949E]">
                              Tổng tiền
                            </p>
                            <p className="mt-1 text-[14px] font-bold text-[#1F2933]">
                              {formatMoney(invoice.total_amount)}
                            </p>
                            {paid > 0 && !isPaid && (
                              <p className="text-xs text-emerald-700">
                                Đã trả: {formatMoney(paid)}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {!isPaid && (
                              <Link
                                to={`/payment?invoice_id=${invoice.id}`}
                                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
                              >
                                Thanh toán ngay
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceRow({ invoice, order })}
                              className="cs-btn cs-btn-secondary cs-btn-sm"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.03)]">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#3A3020]">
                i
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#20252B]">Hỗ trợ hóa đơn & thanh toán</p>
                <p className="mt-1 text-xs leading-5 text-[#66717C]">
                  Quý khách có nhu cầu xuất hóa đơn VAT điện tử cho doanh nghiệp hoặc cần tra soát các giao dịch chuyển khoản, vui lòng liên hệ hotline: <strong>033 240 5972</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL CHI TIẾT HÓA ĐƠN */}
      {selectedInvoiceRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D6A85F]">
                  CHI TIẾT HÓA ĐƠN
                </p>
                <h3 className="text-xl font-extrabold text-[#1F2933]">
                  {selectedInvoiceRow.invoice.invoice_code}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {getVehicleName(selectedInvoiceRow.order.vehicle)} ·{" "}
                  <span className="font-mono text-[#8F641B]">
                    {selectedInvoiceRow.order.vehicle?.license_plate ?? "—"}
                  </span>{" "}
                  · Lệnh: {selectedInvoiceRow.order.repair_order_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceRow(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F7F5] p-4">
                <div>
                  <p className="text-slate-400">Trạng thái thanh toán</p>
                  <p className="mt-0.5 font-bold text-slate-800">
                    {invoiceStatusLabel[selectedInvoiceRow.invoice.status] ??
                      selectedInvoiceRow.invoice.status}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Ngày lập</p>
                  <p className="mt-0.5 font-bold text-slate-800">
                    {formatDate(
                      selectedInvoiceRow.order.completed_at ??
                        selectedInvoiceRow.order.received_at,
                    )}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 font-bold uppercase tracking-wider text-slate-700">
                  Chi tiết hạng mục dịch vụ & phụ tùng
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 bg-[#FAF8F5] font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">Nội dung</th>
                        <th className="px-3 py-2.5 text-center">SL</th>
                        <th className="px-3 py-2.5 text-right">Đơn giá</th>
                        <th className="px-3 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedInvoiceRow.invoice.items ?? []).map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            {it.description ||
                              (it.item_type === "PART" ? "Phụ tùng thay thế" : "Dịch vụ")}
                          </td>
                          <td className="px-3 py-2.5 text-center">{Number(it.quantity)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">
                            {formatMoney(it.unit_price)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                            {formatMoney(it.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-[#FAF8F5] font-bold">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-right text-slate-700">
                          Tổng cộng
                        </td>
                        <td className="px-3 py-3 text-right text-base text-[#1F2933]">
                          {formatMoney(selectedInvoiceRow.invoice.total_amount)}
                        </td>
                      </tr>
                      {Number(selectedInvoiceRow.invoice.discount_amount ?? 0) > 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-slate-600">
                            Giảm trừ
                          </td>
                          <td className="px-3 py-2 text-right text-red-600">
                            -{formatMoney(selectedInvoiceRow.invoice.discount_amount)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Lịch sử thanh toán nếu có */}
              {(selectedInvoiceRow.invoice.payments ?? []).length > 0 && (
                <div>
                  <p className="mb-2 font-bold uppercase tracking-wider text-slate-700">
                    Lịch sử giao dịch thanh toán
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {selectedInvoiceRow.invoice.payments?.map((pm) => (
                      <div key={pm.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-semibold text-slate-800">
                            Phương thức: {pm.payment_method === "DIRECT" || !pm.payment_method ? "Tiền mặt tại quầy" : pm.payment_method}
                          </p>
                          <p className="text-xs text-slate-400">
                            Ngày: {formatDate(pm.payment_date)} · Trạng thái: {pm.status}
                          </p>
                        </div>
                        <p className="font-bold text-emerald-700">{formatMoney(pm.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedInvoiceRow(null)}
                className="cs-btn cs-btn-primary"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}