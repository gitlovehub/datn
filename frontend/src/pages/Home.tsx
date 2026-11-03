import { Link } from "react-router-dom";
import { AtelierCar, AtelierPublicFooter, AtelierPublicHeader } from "../components/AtelierPublic";

const services = [
  { code: "01", title: "Bảo dưỡng định kỳ", description: "Kiểm tra và bảo dưỡng xe theo từng giai đoạn sử dụng." },
  { code: "02", title: "Phanh và lốp xe", description: "Đánh giá tình trạng phanh, lốp, hỗ trợ vận hành an toàn." },
  { code: "03", title: "Kiểm tra tổng quát", description: "Kiểm tra các hệ thống chính trước khi tư vấn dịch vụ." },
];

export default function Home() {
  return <div className="min-h-screen bg-[#f7f7f6] text-[#191919] dark:bg-[#111214] dark:text-[#f5f5f4]">
    <AtelierPublicHeader />
    <main>
      <section className="relative grid min-h-[560px] overflow-hidden bg-[#1d1114] text-white min-[821px]:grid-cols-[1.08fr_0.92fr]">
        <div className="relative z-10 px-6 pt-14 pb-7 min-[821px]:px-10 min-[821px]:py-20 xl:pl-[max(32px,calc((100vw-1290px)/2))]">
          <h1 className="my-6 max-w-[790px] text-[clamp(2.5rem,5.4vw,5.2rem)] leading-[1.05] font-extrabold tracking-[-0.065em]">Chăm sóc xe<br /><em className="not-italic text-[#fd646e]">Chuẩn từng chi tiết</em></h1>
          <p className="max-w-[510px] text-[15px] leading-8 text-[#c7bfc2]">Từ đặt lịch đến khi nhận xe — mọi công đoạn rõ ràng, mọi chi phí minh bạch, và toàn bộ hành trình chăm sóc xe trong một nơi.</p>
          <div className="mt-8 flex flex-wrap gap-3 max-[540px]:[&>a]:w-full"><Link to="/booking" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-[#cf2935] text-white hover:bg-[#b92430] min-h-14 px-6 py-4 text-sm">Đặt lịch bảo dưỡng <span aria-hidden="true">↗</span></Link><a href="#services" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 min-h-14 px-6 py-4 text-sm border-white/25 bg-white/5 text-white hover:bg-white/15">Khám phá dịch vụ</a></div>
          <div className="mt-10 flex flex-wrap gap-8 [&_strong]:text-xl [&_strong]:font-extrabold [&_span]:mt-1 [&_span]:block [&_span]:text-xs [&_span]:tracking-wider [&_span]:text-[#c8a6ab]"><div><strong>03</strong><span>BƯỚC ĐẶT LỊCH</span></div><div><strong>100%</strong><span>MINH BẠCH CHI PHÍ</span></div><div><strong>24/7</strong><span>TRA CỨU TRẠNG THÁI</span></div></div>
        </div>
        <div className="relative min-h-[235px] bg-[radial-gradient(ellipse_at_77%_50%,#84293177,transparent_70%)] min-[821px]:min-h-[430px]"><AtelierCar className="absolute inset-x-[5%] top-[5%] h-[90%] w-[90%] object-contain drop-shadow-2xl min-[821px]:-left-[16%] min-[821px]:w-[115%]" /></div>
      </section>

      <section className="mx-auto max-w-[1250px] px-5 pt-14 pb-20 md:px-7"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-extrabold tracking-[0.17em] text-[#cf2935] uppercase">DỊCH VỤ</div><h2 className="my-3 text-3xl font-extrabold tracking-tight">Chọn đúng gói cho xe của bạn</h2></div><Link to="/services" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]">Xem tất cả dịch vụ</Link></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{services.map(service => <article className="flex flex-col items-start gap-4 rounded-2xl border border-[#e9e9e6] bg-white p-6 dark:border-[#34373a] dark:bg-[#191b1e]" key={service.code}><span className="text-xs font-extrabold tracking-[0.17em] text-[#cf2935] uppercase">GÓI {service.code}</span><h3 className="text-xl font-extrabold">{service.title}</h3><p className="min-h-[47px] text-[13px] leading-6 text-[#757575]">{service.description}</p><div className="h-px w-full bg-[#e9e9e6] dark:bg-[#34373a]"/><span className="text-xs font-bold tracking-wider text-[#757575] uppercase">Tư vấn theo tình trạng xe thực tế</span><Link to="/booking" className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-bold no-underline transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf2935] cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 border-[#e9e9e6] bg-white text-[#191919] hover:border-[#cf2935] dark:border-[#34373a] dark:bg-[#191b1e] dark:text-[#f5f5f4]">Đặt lịch <span aria-hidden="true">↗</span></Link></article>)}</div></section>
    </main>
    <AtelierPublicFooter />
  </div>;
}
