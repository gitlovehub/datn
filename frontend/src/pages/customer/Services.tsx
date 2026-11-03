import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AtelierPublicHeader, AtelierPublicFooter } from "../../components/AtelierPublic";
import { fetchApi } from "../../services/api";

type Service = { id: number; name: string; description?: string | null; category?: string | null; base_price?: number | string | null; estimated_price?: number | string | null };
function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Liên hệ tư vấn";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount) : "Liên hệ tư vấn";
}
export default function Services() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false);
    fetchApi<Service[] | { data: Service[] }>("/services")
      .then(res => { if (alive) setItems(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refresh]);
  return <div className="at-root at-services-page">
    <AtelierPublicHeader />
    <main>
      <section className="bg-[radial-gradient(ellipse_at_88%_45%,#71232b88,transparent_53%)] bg-[#1d1114] py-[94px] text-white max-[600px]:py-16 [&_.at-eyebrow]:text-[#ff9fa5]">
        <div className="at-container"><span className="at-eyebrow">CARSERVICE / SERVICE COLLECTION</span>
          <h1 className="my-[22px] text-[clamp(40px,5vw,70px)] leading-[1.08] max-[600px]:text-[40px]">Chăm sóc đúng cách.<br/><em className="not-italic text-[#fd646e]">Vận hành an tâm.</em></h1>
          <p className="mb-[26px] max-w-[600px] text-[15px] leading-[1.85] text-[#c7bfc2]">Mỗi chiếc xe có nhu cầu riêng. Khám phá dịch vụ đang được gara cung cấp và chủ động đặt lịch bảo dưỡng.</p>
          <Link className="at-btn at-btn-primary at-large" to="/booking">Đặt lịch bảo dưỡng <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section className="at-container at-services-list" id="services">
        <header className="at-section-title"><div><span className="at-eyebrow">DỊCH VỤ CỦA CHÚNG TÔI</span><h2>Danh mục chăm sóc ô tô</h2></div><span className="text-xs font-semibold text-at-muted">Dữ liệu cập nhật từ gara</span></header>
        {loading ? <div role="status" className="rounded-2xl border border-at-border bg-at-surface px-[25px] py-[60px] text-center text-at-muted [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:font-extrabold [&_button]:text-at-accent [&_button]:underline">Đang tải danh mục dịch vụ…</div> :
          error ? <div role="alert" className="rounded-2xl border border-at-border bg-at-surface px-[25px] py-[60px] text-center text-at-muted [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:font-extrabold [&_button]:text-at-accent [&_button]:underline">Không tải được dịch vụ từ máy chủ. <button onClick={() => setRefresh(v => v + 1)}>Thử lại</button></div> :
          items.length === 0 ? <div className="rounded-2xl border border-at-border bg-at-surface px-[25px] py-[60px] text-center text-at-muted [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:font-extrabold [&_button]:text-at-accent [&_button]:underline">Hiện chưa có dịch vụ đang hoạt động.</div> :
          <div className="at-grid-three">{items.map((service, i) => <article className="at-service-card" key={service.id}>
            <div className="flex w-full flex-wrap items-center justify-between gap-3"><span className="at-eyebrow">{String(i + 1).padStart(2,"0")} / AUTO CARE</span><span className="rounded-full bg-at-surface2 px-2.5 py-1.5 text-xs font-extrabold text-at-muted">{service.category || "Dịch vụ"}</span></div>
            <h3>{service.name}</h3><p>{service.description || "Dịch vụ chăm sóc và bảo dưỡng ô tô tại CarService."}</p><div className="at-card-line"/>
            <span className="at-card-label">Giá tham khảo</span><strong className="font-[Manrope,system-ui,sans-serif] text-[23px] font-extrabold text-at-ink">{money(service.base_price ?? service.estimated_price)}</strong>
            <Link to={`/booking?service=${service.id}`} className="at-btn at-btn-outline">Đặt lịch <span aria-hidden="true">↗</span></Link>
          </article>)}</div>}
      </section>
      <section className="at-final-banner"><div className="at-eyebrow">READY WHEN YOU ARE</div><h2>Một lịch hẹn. An tâm cả hành trình.</h2><p>Lựa chọn dịch vụ, đặt lịch tiếp nhận và theo dõi công việc minh bạch.</p><Link to="/booking" className="at-btn at-btn-primary at-large">Đặt lịch ngay ↗</Link></section>
    </main>
    <AtelierPublicFooter />
  </div>;
}
