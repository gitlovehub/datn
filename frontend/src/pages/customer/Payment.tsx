import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Toast, type ToastType } from "../../components/auth/Toast";
import {
  formatDate,
  formatMoney,
  getMyRepairOrderDetail,
  getMyRepairOrders,
  getVehicleName,
  invoiceStatusLabel,
  type CustomerRepairOrder,
} from "../../services/customerApi";

type PaymentTarget = {
  order: CustomerRepairOrder;
  invoice: NonNullable<CustomerRepairOrder["invoice"]>;
};

function Payment() {
  const [searchParams] = useSearchParams();
  const targetInvoiceId = searchParams.get("invoice_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targets, setTargets] = useState<PaymentTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<PaymentTarget | null>(null);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const orders = await getMyRepairOrders();
        const details = await Promise.all(
          orders.map(async (o) => {
            try {
              return await getMyRepairOrderDetail(o.id);
            } catch {
              return o;
            }
          }),
        );
        if (!active) return;

        const list: PaymentTarget[] = [];
        details.forEach((order) => {
          if (order.invoice) {
            list.push({ order, invoice: order.invoice });
          }
        });

        setTargets(list);

        if (list.length > 0) {
          const matched = targetInvoiceId
            ? list.find((item) => String(item.invoice.id) === targetInvoiceId)
            : null;
          setSelectedTarget(matched ?? list[0]);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không thể tải thông tin thanh toán.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [targetInvoiceId]);

  const invoice = selectedTarget?.invoice;
  const order = selectedTarget?.order;
  const isPaid = invoice?.status === "PAID";

  return (
    <div className="at-customer-payment min-h-screen bg-[#F7F7F5] text-[#20252B]">

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:py-14">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / THANH TOÁN
            </p>

            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
                  Thanh toán dịch vụ
                </h1>
                <p className="mt-2 text-[13px] leading-6 text-[#66717C]">
                  Thông tin hóa đơn và hướng dẫn thanh toán tiền mặt tại quầy.
                </p>
              </div>

              <Link
                to="/invoices"
                className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ← Danh sách hóa đơn
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="p-16 text-center text-xs text-[#8A949E]">Đang tải dữ liệu hóa đơn...</p>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
              <p>{error}</p>
            </div>
          ) : !selectedTarget ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-base font-bold text-[#1F2933]">Hiện chưa có hóa đơn nào</p>
              <p className="mt-1 text-xs text-slate-500">
                Khi gara hoàn tất bảo dưỡng hoặc sửa xe của bạn, hóa đơn thanh toán sẽ có tại đây.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* THÔNG TIN HÓA ĐƠN */}
              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                  <div className="flex flex-col gap-3 border-b border-[#E1E4E6] p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                        HÓA ĐƠN
                      </p>
                      <h2 className="mt-1 text-[18px] font-bold text-[#20252B]">
                        {invoice?.invoice_code}
                      </h2>
                    </div>

                    {targets.length > 1 && (
                      <select
                        value={String(invoice?.id)}
                        onChange={(e) => {
                          const t = targets.find((x) => String(x.invoice.id) === e.target.value);
                          if (t) setSelectedTarget(t);
                        }}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-[#D6A85F]"
                      >
                        {targets.map((t) => (
                          <option key={t.invoice.id} value={String(t.invoice.id)}>
                            {t.invoice.invoice_code} · {formatMoney(t.invoice.total_amount)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#F7F7F5] p-4 text-xs">
                      <p className="font-bold text-[#8A949E]">LỆNH DỊCH VỤ</p>
                      <p className="mt-1 text-sm font-bold text-[#20252B]">
                        {order?.repair_order_code}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F7F7F5] p-4 text-xs">
                      <p className="font-bold text-[#8A949E]">TRẠNG THÁI THANH TOÁN</p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          isPaid ? "text-emerald-700" : "text-amber-600"
                        }`}
                      >
                        {invoiceStatusLabel[invoice?.status ?? ""] ?? invoice?.status}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] p-4 text-xs">
                      <p className="font-bold text-[#8A949E]">PHƯƠNG TIỆN</p>
                      <p className="mt-1 text-sm font-bold text-[#20252B]">
                        {getVehicleName(order?.vehicle)}
                      </p>
                      <p className="mt-0.5 font-mono text-[#8F641B]">
                        {order?.vehicle?.license_plate ?? "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E1E4E6] p-4 text-xs">
                      <p className="font-bold text-[#8A949E]">NGÀY LẬP HÓA ĐƠN</p>
                      <p className="mt-1 text-sm font-bold text-[#20252B]">
                        {formatDate(order?.completed_at ?? order?.received_at)}
                      </p>
                    </div>
                  </div>

                  {/* BẢNG HẠNG MỤC HÓA ĐƠN */}
                  <div className="border-t border-[#E1E4E6] p-6">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                      Chi tiết hạng mục
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-[#FAF8F5] font-bold text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5">Hạng mục</th>
                            <th className="px-3 py-2.5 text-center">SL</th>
                            <th className="px-3 py-2.5 text-right">Đơn giá</th>
                            <th className="px-3 py-2.5 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(invoice?.items ?? []).map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2.5 font-medium text-slate-800">
                                {it.description ||
                                  (it.item_type === "PART" ? "Phụ tùng" : "Tiền công dịch vụ")}
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
                              Tổng thanh toán
                            </td>
                            <td className="px-3 py-3 text-right text-base text-[#1F2933]">
                              {formatMoney(invoice?.total_amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI HƯỚNG DẪN THANH TOÁN */}
              <div className="h-fit space-y-6">
                <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.05)]">
                  <div className="bg-[#1F2933] p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                      TỔNG THANH TOÁN
                    </p>
                    <p className="mt-2 text-[28px] font-extrabold tracking-tight">
                      {formatMoney(invoice?.total_amount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      {isPaid ? "✓ Hóa đơn này đã được thanh toán" : "Cần thanh toán để nhận xe"}
                    </p>
                  </div>

                  <div className="p-6 text-xs">
                    <p className="mb-2 font-bold text-slate-700">Hình thức thanh toán</p>
                    <div className="rounded-2xl bg-[#FAF8F5] p-4 text-slate-700">
                      <p className="font-bold text-[#1F2933]">Tiền mặt tại quầy gara</p>
                      <p className="mt-2 font-semibold leading-5">
                        {isPaid
                          ? "Gara đã xác nhận nhận đủ tiền. Cảm ơn quý khách."
                          : `Quý khách vui lòng thanh toán tại quầy khi nhận xe, đọc mã hóa đơn ${invoice?.invoice_code ?? ""} cho cố vấn. Trạng thái sẽ cập nhật ngay khi cố vấn xác nhận đã nhận tiền.`}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                      <p className="text-xs text-slate-500">
                        Hotline hỗ trợ tài chính / tra soát:
                      </p>
                      <a
                        href="tel:0332405972"
                        className="mt-1 block font-bold text-[#1F2933] hover:underline"
                      >
                        033 240 5972
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Payment;