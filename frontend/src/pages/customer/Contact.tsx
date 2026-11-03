import { useState } from "react";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function Contact() {
  const { notify } = useAppFeedback();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!name || !phone || !message) {
      notify("Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung.", "error");
      return;
    }

    notify("Biểu mẫu liên hệ chưa được nối API gửi tin. Bạn hãy gọi số hotline để được hỗ trợ; thông tin chưa được gửi.", "info");
    return;

    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#20252B]">
      <Header />

      <main>
        <section className="border-b border-[#E1E4E6] bg-white">
          <div className="mx-auto max-w-[1280px] px-6 py-12 md:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D6A85F]">
              CARSERVICE / LIÊN HỆ
            </p>

            <h1 className="mt-3 text-[32px] font-bold tracking-[-1px] text-[#1F2933] md:text-[42px]">
              Liên hệ với chúng tôi
            </h1>

            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#66717C]">
              Nếu bạn cần hỗ trợ về dịch vụ, lịch hẹn hoặc tình trạng xe,
              hãy liên hệ với CarService.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E1E4E6] bg-white p-6 shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    CONTACT
                  </p>

                  <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                    Thông tin liên hệ
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#66717C]">
                    Bạn có thể liên hệ với CarService thông qua các thông tin
                    dưới đây.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="group rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition hover:border-[#D6A85F] hover:bg-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F2933] text-xs font-bold text-white">
                          ☎
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">
                            Điện thoại
                          </p>

                          <a href="tel:0332405972" className="mt-1 block text-[13px] font-semibold text-[#20252B] hover:text-[#D6A85F] transition">
                            033 240 5972
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition hover:border-[#D6A85F] hover:bg-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                          @
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">
                            Email
                          </p>

                          <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                            contact@carservice.vn
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition hover:border-[#D6A85F] hover:bg-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                          ĐC
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">
                            Địa chỉ gara
                          </p>

                          <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                            Hà Nội, Việt Nam
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-[#E1E4E6] bg-[#F7F7F5] p-4 transition hover:border-[#D6A85F] hover:bg-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D2] text-xs font-bold text-[#1F2933]">
                          TG
                        </div>

                        <div>
                          <p className="text-xs text-[#8A949E]">
                            Thời gian làm việc
                          </p>

                          <p className="mt-1 text-[13px] font-semibold text-[#20252B]">
                            08:00 – 17:30
                          </p>

                          <p className="mt-1 text-xs text-[#8A949E]">
                            Thứ 2 – Thứ 7
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#1F2933] p-5 text-white shadow-[0_10px_30px_rgba(31,41,51,0.10)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D6A85F] text-xs font-bold text-[#1F2933]">
                      i
                    </div>

                    <div>
                      <p className="text-[13px] font-semibold">
                        Hỗ trợ khách hàng
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#AEB8C1]">
                        Đội ngũ CarService sẽ tiếp nhận và phản hồi yêu cầu
                        của bạn trong thời gian sớm nhất.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-[0_8px_25px_rgba(31,41,51,0.04)]">
                <div className="border-b border-[#E1E4E6] px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D6A85F]">
                    SEND MESSAGE
                  </p>

                  <h2 className="mt-1 text-[17px] font-bold text-[#20252B]">
                    Gửi yêu cầu hỗ trợ
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#66717C]">
                    Điền thông tin bên dưới để CarService có thể hỗ trợ bạn.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                        Họ và tên
                      </label>

                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập họ và tên"
                        className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                        Số điện thoại
                      </label>

                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Nhập số điện thoại"
                        className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                      Email
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email"
                      className="w-full rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-[#20252B]">
                      Nội dung
                    </label>

                    <textarea
                      rows={8}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Nhập nội dung cần hỗ trợ..."
                      className="w-full resize-none rounded-xl border border-[#DDE1E4] bg-[#FAFAF9] px-4 py-3 text-[13px] text-[#20252B] outline-none transition placeholder:text-[#A1A9B0] focus:border-[#D6A85F] focus:bg-white focus:ring-2 focus:ring-[#D6A85F]/10"
                    />
                  </div>

                  <div className="flex flex-col justify-between gap-4 border-t border-[#E1E4E6] pt-5 sm:flex-row sm:items-center">
                    <p className="max-w-md text-xs leading-5 text-[#8A949E]">
                      Vui lòng cung cấp thông tin chính xác để CarService
                      có thể liên hệ lại với bạn.
                    </p>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="cs-btn cs-btn-primary"
                    >
                      Gửi yêu cầu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;