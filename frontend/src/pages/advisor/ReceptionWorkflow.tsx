import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  advisorAppointment, checkInConfirmedAppointment, confirmPendingAppointment, findOrderForAppointment,
  listReceptionAppointments, receiveRepairOrder, type WorkflowAppointment, type WorkflowOrder,
} from "../../services/workflowService";
import { card, input, action, outline, WorkflowTitle, Notice, Status, errorText } from "./WorkflowUI";

export default function ReceptionWorkflow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { confirm, notify } = useAppFeedback();
  const selectedId = Number(searchParams.get("appointment"));
  const [appointments, setAppointments] = useState<WorkflowAppointment[]>([]);
  const [selected, setSelected] = useState<WorkflowAppointment | null>(null);
  const [order, setOrder] = useState<WorkflowOrder | null>(null);
  const [busy, setBusy] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [pending, confirmed, checkedIn] = await Promise.all([
        listReceptionAppointments("PENDING"), listReceptionAppointments("CONFIRMED"), listReceptionAppointments("CHECKED_IN"),
      ]);
      setAppointments([...pending, ...confirmed, ...checkedIn].sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`)));
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!Number.isSafeInteger(selectedId) || selectedId < 1) {
      queueMicrotask(() => { setSelected(null); setOrder(null); });
      return;
    }
    let active = true;
    queueMicrotask(() => { setBusy(true); setError(""); setOrder(null); setMessage(""); });
    advisorAppointment(selectedId).then(async appointment => {
      if (!active) return;
      setSelected(appointment);
      if (appointment.status === "CHECKED_IN") {
        const matched = await findOrderForAppointment(selectedId);
        if (active) setOrder(matched);
      }
    }).catch(err => { if (active) setError(errorText(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selectedId]);

  function selectAppointment(id: number) { setSearchParams({ appointment: String(id) }); setCondition(""); setNote(""); setMileage(""); }

  async function handleConfirm() {
    if (!selected || selected.status !== "PENDING") return;
    const approved = await confirm({
      title: "Xác minh lịch hẹn với khách", reference: selected.appointment_code, phone: selected.customer?.phone,
      description: `Hãy gọi ${selected.customer?.full_name || "khách hàng"} qua ${selected.customer?.phone || "số điện thoại trên hồ sơ"} để xác nhận thời gian ${selected.appointment_date} lúc ${selected.appointment_time}. Không xác nhận nếu chưa được khách đồng ý.`,
      confirmText: "Khách đồng ý – Xác nhận", cancelText: "Chưa xác minh / Để sau",
      checklist: ["Đã trao đổi trực tiếp với khách về xe, dịch vụ và giờ hẹn.", "Khách đồng ý lịch hẹn và gara có khả năng tiếp nhận."],
    });
    if (!approved) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const updated = await confirmPendingAppointment(selected.id);
      setSelected(updated); notify("Đã xác nhận lịch với khách. Chờ xe đến gara.", "success"); setMessage("Đã xác nhận lịch. Có thể tiếp nhận xe khi khách đến gara.");
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function handleCheckIn() {
    if (!selected || selected.status !== "CONFIRMED") return;
    const approved = await confirm({
      title: "Xác nhận khách và xe đến gara", reference: selected.appointment_code,
      description: `Kiểm tra khách và xe biển số ${selected.vehicle?.license_plate || "trên lịch hẹn"} đã thực sự có mặt. Xác nhận lịch qua điện thoại không đồng nghĩa đã tiếp nhận xe.`,
      confirmText: "Đã kiểm tra – Tiếp nhận xe",
      checklist: ["Khách hàng và phương tiện đã đến gara.", "Đã đối chiếu biển số, thông tin khách hàng và tình trạng xe ban đầu."],
    });
    if (!approved) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const updated = await checkInConfirmedAppointment(selected.id);
      setSelected(updated); notify("Đã xác nhận xe đến gara và tiếp nhận thành công.", "success"); setMessage("Đã check-in. Tiếp theo hãy ghi tình trạng xe để tạo một phiếu sửa chữa.");
      const existing = await findOrderForAppointment(selected.id);
      setOrder(existing);
      await refresh();
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  async function submitReceive(event: FormEvent) {
    event.preventDefault();
    if (!selected || selected.status !== "CHECKED_IN" || working) return;
    const customerId = selected.customer?.id ?? selected.customer_id;
    const vehicleId = selected.vehicle?.id ?? selected.vehicle_id;
    if (!customerId || !vehicleId) { setError("Không xác định được khách hàng hoặc xe trong lịch hẹn."); return; }
    if (mileage.trim() && (!/^\d+$/.test(mileage.trim()) || !Number.isSafeInteger(Number(mileage)))) {
      setError("Số km phải là số nguyên không âm."); return;
    }
    const approved = await confirm({
      title: "Xác nhận tạo phiếu sửa chữa",
      reference: selected.appointment_code,
      description: `Tạo một phiếu sửa chữa cho xe ${selected.vehicle?.license_plate || "của khách"} ở trạng thái RECEIVED. Mỗi lịch hẹn chỉ được có một phiếu, thao tác này sẽ lưu lên hệ thống.`,
      confirmText: "Tạo phiếu sửa chữa",
      checklist: ["Đã kiểm tra thông tin xe và tình trạng bàn giao trước khi lập phiếu."],
    });
    if (!approved) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const result = await receiveRepairOrder({
        appointment_id: selected.id, customer_id: customerId, vehicle_id: vehicleId,
        ...(mileage.trim() ? { mileage_received: Number(mileage) } : {}),
        ...(condition.trim() ? { initial_condition: condition.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setOrder(result.order);
      navigate(`/advisor/service-orders/${result.order.id}`, { replace: true, state: { success: result.existing ? "Phiếu đã tồn tại, không tạo trùng." : "Đã tạo phiếu sửa chữa thành công." } });
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <main className="mx-auto max-w-6xl pb-12">
    <WorkflowTitle label="SERVICE DESK / RECEPTION" title="Tiếp nhận xe" sub="Lịch chờ → xác nhận → check-in → lập một phiếu sửa chữa. Kết quả cập nhật trực tiếp trên Laravel."/>
    {error && <Notice tone="error">{error}</Notice>}
    {message && <Notice tone="success">{message}</Notice>}
    <div className="grid gap-6 xl:grid-cols-[minmax(310px,0.8fr)_minmax(0,1.2fr)]">
      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-cs-text">Lịch đang xử lý</h2><button type="button" className={outline} disabled={busy || working} onClick={() => void refresh()}>Làm mới</button></div>
        {busy && <p className="text-sm text-cs-muted">Đang tải lịch từ API...</p>}
        {!busy && !appointments.length && <p className="text-sm text-cs-muted">Chưa có lịch PENDING, CONFIRMED hoặc CHECKED_IN.</p>}
        <div className="max-h-[630px] space-y-3 overflow-y-auto pr-1">
          {appointments.map(item => <button key={item.id} type="button" onClick={() => selectAppointment(item.id)} className={`w-full rounded-xl border p-4 text-left transition hover:border-cs-accent hover:bg-cs-soft ${selectedId === item.id ? "border-cs-accent bg-cs-soft" : "border-cs-border"}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-cs-text">{item.appointment_code || `Lịch #${item.id}`}</strong><Status status={item.status}/></div>
            <p className="text-sm text-cs-text">{item.customer?.full_name || `Khách #${item.customer_id || "?"}`} — {item.vehicle?.license_plate || "Chưa có biển số"}</p>
            <p className="mt-1 text-xs text-cs-muted">{item.appointment_date} · {item.appointment_time}</p>
          </button>)}
        </div>
        <Link to="/advisor/appointments" className={`${outline} mt-5`}>Xem đầy đủ danh sách lịch →</Link>
      </section>
      <section className={card}>
        {selectedId > 0 && busy ? <div className="py-16 text-center text-cs-muted">Đang kiểm tra lịch và phiếu đã tồn tại...</div> : !selected ? <div className="py-16 text-center text-cs-muted">Chọn một lịch để thực hiện tiếp nhận. Bạn cũng có thể vào đây từ nút Tiếp nhận trên trang Lịch hẹn.</div> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-cs-accent">Lịch {selected.appointment_code || selected.id}</p><h2 className="mt-2 text-xl font-bold text-cs-text">{selected.customer?.full_name || "Khách hàng"}</h2></div><Status status={selected.status}/></div>
          <dl className="grid gap-3 border-y border-cs-border py-5 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-cs-muted">Khách hàng</dt><dd className="mt-1 text-cs-text">{selected.customer?.full_name || `#${selected.customer_id || "?"}`}</dd></div>
            <div><dt className="text-xs text-cs-muted">Điện thoại</dt><dd className="mt-1 text-cs-text">{selected.customer?.phone || "—"}</dd></div>
            <div><dt className="text-xs text-cs-muted">Xe</dt><dd className="mt-1 text-cs-text">{selected.vehicle?.license_plate || `#${selected.vehicle_id || "?"}`}</dd></div>
            <div><dt className="text-xs text-cs-muted">Ngày / giờ</dt><dd className="mt-1 text-cs-text">{selected.appointment_date} · {selected.appointment_time}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-cs-muted">Mô tả yêu cầu</dt><dd className="mt-1 text-cs-text">{selected.symptom_description || selected.note || "Không có ghi chú"}</dd></div>
          </dl>
          <ol className="my-6 flex flex-wrap gap-2 text-xs font-semibold text-cs-muted"><li className="rounded-full bg-cs-soft px-3 py-2">1. Đặt lịch</li><li className="rounded-full bg-cs-soft px-3 py-2">2. Xác nhận</li><li className="rounded-full bg-cs-soft px-3 py-2">3. Check-in</li><li className="rounded-full bg-cs-soft px-3 py-2">4. Phiếu sửa chữa</li></ol>
          {selected.status === "PENDING" && <div><p className="mb-4 text-sm text-cs-muted">Cần xác nhận lịch trước khi tiếp nhận.</p><button type="button" className={action} disabled={working} onClick={() => void handleConfirm()}>{working ? "Đang xử lý..." : "Xác nhận lịch hẹn"}</button></div>}
          {selected.status === "CONFIRMED" && <div><p className="mb-4 text-sm text-cs-muted">Chỉ check-in sau khi xe thực sự đến gara.</p><button type="button" className={action} disabled={working} onClick={() => void handleCheckIn()}>{working ? "Đang tiếp nhận..." : "Tiếp nhận xe (CHECKED_IN)"}</button></div>}
          {selected.status === "CHECKED_IN" && (order ? <div><Notice tone="success">Lịch đã có phiếu {order.repair_order_code || `#${order.id}`}. Không được tạo phiếu thứ hai.</Notice><Link className={action} to={`/advisor/service-orders/${order.id}`}>Xem phiếu sửa chữa →</Link></div>
            : <form onSubmit={event => void submitReceive(event)} className="space-y-4"><h3 className="text-lg font-bold text-cs-text">Lập phiếu sửa chữa (RECEIVED)</h3>
              <label className="block text-sm font-semibold text-cs-text">Số km khi tiếp nhận (không bắt buộc)<input className={input} type="number" min="0" step="1" inputMode="numeric" value={mileage} onChange={event => setMileage(event.target.value)} placeholder="Ví dụ 35000"/></label>
              <label className="block text-sm font-semibold text-cs-text">Tình trạng xe ban đầu<textarea className={input} rows={3} value={condition} onChange={event => setCondition(event.target.value)} placeholder="Ghi nhận hư hỏng, ngoại thất, hiện trạng..."/></label>
              <label className="block text-sm font-semibold text-cs-text">Ghi chú tiếp nhận<textarea className={input} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Ghi chú bàn giao và yêu cầu của khách"/></label>
              <button type="submit" className={action} disabled={working}>{working ? "Đang lập phiếu..." : "Tạo phiếu sửa chữa →"}</button>
              <p className="text-xs leading-5 text-cs-muted">Phiếu được tạo ở trạng thái RECEIVED. Bước tiếp theo: ghi kết quả kiểm tra ngay trên trang phiếu.</p>
            </form>)}
          {selected.status === "CANCELLED" && <Notice tone="error">Lịch đã hủy, không thể tiếp nhận.</Notice>}
        </>}
      </section>
    </div>
  </main>;
}
