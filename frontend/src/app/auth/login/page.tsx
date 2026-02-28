"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

type Step = "choose" | "email" | "telegram" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [botUsername, setBotUsername] = useState("CorpPortalBot");

  useEffect(() => {
    fetch("/api/telegram/info")
      .then(r => r.json())
      .then(d => { if (d.bot_username) setBotUsername(d.bot_username); })
      .catch(() => {});
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await authApi.sendOtp(email);
      setStep("otp");
    } catch {
      setError("Не удалось отправить код. Проверьте email.");
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await authApi.verifyOtp(email, code);
      router.push("/dashboard");
    } catch {
      setError("Неверный или просроченный код.");
    } finally { setLoading(false); }
  };

  const telegramUrl = `https://t.me/${botUsername}`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Левая панель — информация о портале */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-500 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <span className="text-4xl">📊</span>
            <div>
              <div className="text-xl font-bold">Корпоративный портал</div>
              <div className="text-brand-200 text-sm">Управление KPI и эффективностью</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-6 leading-tight">
            Единая платформа для управления показателями компании
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed mb-10">
            Отслеживайте KPI в реальном времени, управляйте командой и принимайте решения на основе данных.
          </p>

          <div className="space-y-4">
            {[
              { icon: "📈", title: "Мониторинг KPI", desc: "Актуальные показатели эффективности в режиме реального времени" },
              { icon: "👥", title: "Управление командой", desc: "Иерархическая структура сотрудников с ролевым доступом" },
              { icon: "🔗", title: "Корпоративные ресурсы", desc: "Быстрый доступ к инструментам и документам компании" },
              { icon: "🔒", title: "Безопасный вход", desc: "Двухфакторная аутентификация через email или Telegram" },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-brand-200 text-sm">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-brand-300 text-sm">
          Доступ только для сотрудников компании. Несанкционированный вход запрещён.
        </div>
      </div>

      {/* Правая панель — форма входа */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">

          {/* Мобильный логотип */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-3xl">📊</span>
            <div className="font-bold text-xl text-gray-800">Корпоративный портал</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">

            {/* ── Шаг 1: выбор способа ── */}
            {step === "choose" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Вход в систему</h2>
                <p className="text-gray-500 text-sm mb-8">Выберите способ авторизации</p>

                <div className="space-y-3">
                  <button onClick={() => setStep("telegram")}
                    className="w-full flex items-center gap-4 px-5 py-4 border-2 border-blue-400 rounded-xl hover:bg-blue-50 transition group">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl group-hover:bg-blue-600 transition">✈️</div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">Через Telegram</div>
                      <div className="text-xs text-gray-500">{"Код придёт в бот @" + botUsername}</div>
                    </div>
                    <div className="ml-auto text-gray-300">→</div>
                  </button>

                  <button onClick={() => setStep("email")}
                    className="w-full flex items-center gap-4 px-5 py-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition group">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl group-hover:bg-gray-200 transition">✉️</div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-800">По корпоративному email</div>
                      <div className="text-xs text-gray-500">Код придёт на вашу рабочую почту</div>
                    </div>
                    <div className="ml-auto text-gray-300">→</div>
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">
                  Доступ предоставляется только зарегистрированным сотрудникам.<br/>
                  По вопросам обратитесь к администратору системы.
                </p>
              </div>
            )}

            {/* ── Шаг 2а: Telegram ── */}
            {step === "telegram" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Вход через Telegram</h2>
                <p className="text-gray-500 text-sm mb-6">Откройте бот и введите ваш рабочий email</p>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                  <ol className="space-y-3 text-sm text-gray-700">
                    <li className="flex gap-3"><span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>Откройте Telegram-бот по кнопке ниже</li>
                    <li className="flex gap-3"><span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>Введите ваш корпоративный email в боте</li>
                    <li className="flex gap-3"><span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>Получите 6-значный код и введите его ниже</li>
                  </ol>
                </div>

                <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition mb-6">
                  {"Открыть @" + botUsername}
                </a>

                <div className="space-y-3">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@company.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => { if (email) setStep("otp"); }} disabled={!email}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-semibold transition disabled:opacity-40">
                    Я получил код →
                  </button>
                </div>

                <button onClick={() => setStep("choose")} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600 transition">← Назад</button>
              </div>
            )}

            {/* ── Шаг 2б: Email ── */}
            {step === "email" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Вход по email</h2>
                <p className="text-gray-500 text-sm mb-6">Введите корпоративный email для получения кода</p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@company.com" required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                    {loading ? "Отправка..." : "Получить код"}
                  </button>
                </form>

                <button onClick={() => setStep("choose")} className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600 transition">← Назад</button>
              </div>
            )}

            {/* ── Шаг 3: ввод кода ── */}
            {step === "otp" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Введите код</h2>
                <p className="text-gray-500 text-sm mb-6">Код отправлен на <span className="font-medium text-gray-700">{email}</span></p>

                <form onSubmit={handleVerify} className="space-y-4">
                  <input type="text" value={code} onChange={e => setCode(e.target.value)}
                    placeholder="000000" maxLength={6} required
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-center text-3xl tracking-widest font-mono" />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                    {loading ? "Проверка..." : "Войти в систему"}
                  </button>
                </form>

                <button onClick={() => { setStep("choose"); setCode(""); setError(""); }}
                  className="mt-4 w-full text-gray-400 text-sm hover:text-gray-600 transition">← Назад</button>
              </div>
            )}

          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Корпоративный портал. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
}
