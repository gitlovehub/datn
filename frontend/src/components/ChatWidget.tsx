import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "../services/api";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "carservice_chat_history";
const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Xin chào! Mình là trợ lý AI của CarService. Mình có thể tư vấn dịch vụ, gói bảo dưỡng, giá tham khảo, giờ làm việc và giải đáp thắc mắc về xe của bạn. Bạn cần giúp gì ạ?",
};
const SUGGESTIONS = [
  "Giá thay dầu động cơ?",
  "Gara mở cửa mấy giờ?",
  "Xe 10.000 km nên bảo dưỡng gì?",
  "Cách đặt lịch hẹn?",
];

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* ignore corrupted history */
  }
  return [GREETING];
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  }, [messages]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      inputRef.current?.focus();
    }
  }, [messages, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data } = await apiClient.post<{ reply: string }>(
        "/chatbot",
        { messages: next.map(({ role, content }) => ({ role, content })) },
        { timeout: 50000 },
      );
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không thể kết nối trợ lý, vui lòng thử lại.";
      setMessages([...next, { role: "assistant", content: `⚠️ ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function resetChat() {
    setMessages([GREETING]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3 print:hidden">
      {open && (
        <section
          id="chatbot-panel"
          aria-label="Trợ lý AI CarService"
          className="flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white shadow-2xl shadow-slate-900/20 animate-in fade-in zoom-in-95 duration-200"
        >
          <header className="flex items-center gap-3 bg-[#1F2933] px-4 py-3 text-white">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D6A85F] text-lg">
              🤖
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1F2933] bg-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Trợ lý CarService</p>
              <p className="text-xs text-slate-300">Trả lời tức thì · Hỗ trợ AI</p>
            </div>
            <button
              type="button"
              id="chatbot-reset"
              onClick={resetChat}
              title="Cuộc trò chuyện mới"
              className="cursor-pointer rounded-lg px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Làm mới
            </button>
            <button
              type="button"
              id="chatbot-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng chatbot"
              className="cursor-pointer rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#F6F7F8] px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-[#1F2933] text-white"
                      : "rounded-bl-md border border-[#E1E4E6] bg-white text-[#1F2933]"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#E1E4E6] bg-white px-4 py-3 shadow-sm">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D6A85F]"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="cursor-pointer rounded-full border border-[#D6A85F]/60 bg-white px-3 py-1.5 text-xs font-medium text-[#1F2933] transition hover:bg-[#D6A85F]/15"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-[#E1E4E6] bg-white p-3">
            <input
              ref={inputRef}
              id="chatbot-input"
              value={input}
              onChange={event => setInput(event.target.value)}
              maxLength={500}
              placeholder="Nhập câu hỏi của bạn..."
              className="min-w-0 flex-1 rounded-xl border border-[#E1E4E6] bg-[#F6F7F8] px-3.5 py-2.5 text-[13px] text-[#1F2933] outline-none transition focus:border-[#D6A85F] focus:bg-white"
            />
            <button
              type="submit"
              id="chatbot-send"
              disabled={loading || !input.trim()}
              aria-label="Gửi"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#1F2933] text-white transition hover:bg-[#2e3b47] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        id="chatbot-toggle"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="chatbot-panel"
        aria-label={open ? "Đóng chatbot" : "Mở chatbot tư vấn"}
        className="group flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#1F2933] text-2xl text-white shadow-xl shadow-slate-900/30 ring-2 ring-[#D6A85F] transition hover:scale-105 hover:bg-[#2e3b47]"
      >
        <span className="transition group-hover:rotate-12">{open ? "✕" : "💬"}</span>
      </button>
    </div>
  );
}
