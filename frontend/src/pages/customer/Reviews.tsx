import { useEffect, useState } from "react";
import CustomerHeader from "../../components/CustomerHeader";
import CustomerTopbar from "../../components/CustomerTopbar";
import { Toast, type ToastType } from "../../components/auth/Toast";
import {
  formatDate,
  getMyRepairOrders,
  getMyReviews,
  getVehicleName,
  submitReview,
  type CustomerRepairOrder,
  type CustomerReview,
} from "../../services/customerApi";

function Reviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [finishedOrders, setFinishedOrders] = useState<CustomerRepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form gửi đánh giá
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [advisorRating, setAdvisorRating] = useState<number>(5);
  const [technicianRating, setTechnicianRating] = useState<number>(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reviewData, orderData] = await Promise.all([
        getMyReviews(),
        getMyRepairOrders(),
      ]);
      setReviews(reviewData);

      // Backend chỉ nhận đánh giá cho phiếu đã bàn giao xe (HANDED_OVER)
      const finished = orderData.filter((o) => o.status === "HANDED_OVER");
      setFinishedOrders(finished);

      // Tìm phiếu đầu tiên chưa được đánh giá để gán mặc định
      const reviewedOrderIds = new Set(reviewData.map((r) => r.repair_order_id));
      const unreviewed = finished.find((o) => !reviewedOrderIds.has(o.id));
      if (unreviewed) {
        setSelectedOrderId(String(unreviewed.id));
      } else if (finished.length > 0) {
        setSelectedOrderId(String(finished[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu đánh giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const reviewedIds = new Set(reviews.map((r) => r.repair_order_id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setSubmitError("Vui lòng chọn phiếu dịch vụ cần đánh giá.");
      return;
    }
    if (reviewedIds.has(Number(selectedOrderId))) {
      setSubmitError("Phiếu dịch vụ này bạn đã gửi đánh giá trước đó.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await submitReview({
        repair_order_id: Number(selectedOrderId),
        overall_rating: rating,
        advisor_rating: advisorRating,
        technician_rating: technicianRating,
        comment: content.trim(),
      });
      setToast({ message: "Cảm ơn bạn đã gửi đánh giá dịch vụ!", type: "success" });
      setContent("");
      await loadData();
    } catch (err) {
      const eObj = err as { data?: { message?: string }; message?: string };
      setSubmitError(eObj.data?.message || eObj.message || "Không thể gửi đánh giá lúc này.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="at-customer-reviews min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <CustomerHeader />
      <CustomerTopbar />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <main className="lg:ml-[250px]">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-8 md:py-14">
          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              KHÁCH HÀNG / ĐÁNH GIÁ
            </p>

            <h1 className="text-[30px] font-bold tracking-[-0.8px] text-[#1F2933]">
              Đánh giá dịch vụ
            </h1>

            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#66717C]">
              Chia sẻ trải nghiệm của bạn sau khi bảo dưỡng, sửa chữa xe tại CarService. Ý kiến của bạn giúp chúng tôi không ngừng hoàn thiện.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* CỘT TRÁI: FORM GỬI ĐÁNH GIÁ */}
            <form
              onSubmit={handleSubmit}
              className="h-fit rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                GỬI PHẢN HỒI
              </p>
              <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                Đánh giá lần làm dịch vụ
              </h2>

              <div className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-[#20252B]">
                    Chọn phiếu sửa chữa đã hoàn tất *
                  </label>
                  {finishedOrders.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
                      Bạn chưa có phiếu sửa chữa nào hoàn tất để đánh giá.
                    </p>
                  ) : (
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="h-11 w-full cursor-pointer rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-3 font-medium outline-none focus:border-[#D6A85F] focus:bg-white"
                    >
                      {finishedOrders.map((o) => {
                        const isRev = reviewedIds.has(o.id);
                        return (
                          <option key={o.id} value={String(o.id)}>
                            {o.repair_order_code} · {getVehicleName(o.vehicle)} {isRev ? "(Đã đánh giá)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-2 block font-bold text-[#20252B]">
                    Mức độ hài lòng chung *
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRating(item)}
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-base transition ${
                          item <= rating
                            ? "bg-[#D6A85F] text-[#3A3020]"
                            : "border border-[#DDE1E4] bg-white text-[#8A949E] hover:border-[#D6A85F]"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-[#8A949E]">
                    {rating === 5
                      ? "Rất hài lòng (5/5 sao)"
                      : rating === 4
                        ? "Hài lòng (4/5 sao)"
                        : rating === 3
                          ? "Bình thường (3/5 sao)"
                          : `${rating}/5 sao`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Cố vấn dịch vụ</label>
                    <select
                      value={advisorRating}
                      onChange={(e) => setAdvisorRating(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2"
                    >
                      <option value={5}>5 sao - Tận tình</option>
                      <option value={4}>4 sao - Tốt</option>
                      <option value={3}>3 sao - Khá</option>
                      <option value={2}>2 sao</option>
                      <option value={1}>1 sao</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-600">Kỹ thuật viên</label>
                    <select
                      value={technicianRating}
                      onChange={(e) => setTechnicianRating(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2"
                    >
                      <option value={5}>5 sao - Tay nghề cao</option>
                      <option value={4}>4 sao - Tốt</option>
                      <option value={3}>3 sao - Khá</option>
                      <option value={2}>2 sao</option>
                      <option value={1}>1 sao</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-[#20252B]">
                    Nội dung nhận xét
                  </label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Chia sẻ cảm nhận về thái độ phục vụ, thời gian giao xe, chất lượng sửa chữa..."
                    className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-white p-3 text-xs outline-none focus:border-[#D6A85F]"
                  />
                </div>

                {submitError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || finishedOrders.length === 0}
                  className="cs-btn cs-btn-primary cs-btn-block" aria-busy={submitting}
                >
                  {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>

            {/* CỘT PHẢI: LỊCH SỬ ĐÁNH GIÁ CỦA TÔI */}
            <div className="rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#E1E4E6] px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    LỊCH SỬ
                  </p>
                  <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                    Các đánh giá bạn đã gửi
                  </h2>
                </div>

                <div className="rounded-full bg-[#F3F4F2] px-3 py-1.5 text-xs font-semibold text-[#66717C]">
                  {reviews.length} đánh giá
                </div>
              </div>

              {loading ? (
                <p className="p-12 text-center text-xs text-[#8A949E]">Đang tải đánh giá...</p>
              ) : error ? (
                <div className="p-8 text-center text-xs text-red-600">
                  <p>{error}</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="p-12 text-center text-xs">
                  <p className="font-bold text-[#1F2933]">Chưa có đánh giá nào</p>
                  <p className="mt-1 text-slate-500">
                    Sau khi hoàn tất dịch vụ, bạn có thể gửi đánh giá ở khung bên trái.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-5">
                  {reviews.map((rev) => {
                    const ro = rev.repair_order ?? rev.repairOrder;
                    return (
                      <div
                        key={rev.id}
                        className="rounded-2xl border border-[#E5E8EA] bg-[#FAFAF9] p-5 transition hover:border-[#D6A85F]"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#1F2933]">
                                Phiếu {ro?.repair_order_code ?? `#${rev.repair_order_id}`}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                Đã ghi nhận
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs font-semibold text-slate-800">
                              {getVehicleName(ro?.vehicle)} ·{" "}
                              <span className="font-mono text-[#8F641B]">
                                {ro?.vehicle?.license_plate ?? "—"}
                              </span>
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="text-base tracking-[0.1em] text-[#D6A85F]">
                              {"★".repeat(rev.overall_rating)}
                              <span className="text-slate-300">
                                {"★".repeat(5 - rev.overall_rating)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(rev.created_at)}
                            </p>
                          </div>
                        </div>

                        {rev.comment && (
                          <div className="mt-3 rounded-xl bg-white p-3.5 text-xs italic text-slate-700 border border-slate-100">
                            “{rev.comment}”
                          </div>
                        )}

                        {rev.reply && (
                          <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                            <p className="font-bold text-amber-800">Phản hồi từ Ban Quản Trị CarService:</p>
                            <p className="mt-1 leading-5">{rev.reply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E1E4E6] bg-white p-5 shadow-[0_8px_25px_rgba(31,41,51,0.03)]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                i
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#20252B]">
                  Góp ý của bạn rất quan trọng
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7B858F]">
                  Hãy đánh giá trung thực để CarService không ngừng nâng cao tay nghề kỹ thuật và chất lượng phục vụ khách hàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Reviews;