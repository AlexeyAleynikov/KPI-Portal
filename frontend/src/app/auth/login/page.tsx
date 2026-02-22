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
    setLoading(true);
    setError("");
    try {
      await authApi.sendOtp(email);
      setStep("otp");
    } catch {
      setError("Не удалось отправить код. Проверьте email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.verifyOtp(email, code);
      router.push("/dashboard");
    } catch {
      setError("Неверный или просроченный код.");
    } finally {
      setLoading(false);
    }
  };

  const telegramUrl = `https://t.me/${botUsername}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
          Корпоративный портал
        </h1>

        {step === "choose" && (
          <div className="mt-6 space-y-4">
            <p className="text-gray-500 text-sm text-center mb-6">
              Выберите способ авторизации
            </p>
            <button
              onClick={() => setStep("telegram")}
              className="w-full flex items-center gap-4 px-5 py-4 border-2 border-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900 transition"
            >
              <span className="text-3xl">✈️</span>
              <div className="text-left">
                <div className="font-semibold text-gray-800 dark:text-white">Через Telegram</div>
                <div className="text-xs text-gray-500">{"Код придёт в бот @" + botUsername}</div>
              </div>
            </button>
            <button
              onClick={() => setStep("email")}
              className="w-full flex items-center gap-4 px-5 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <span className="text-3xl">✉️</span>
              <div className="text-left">
                <div className="font-semibold text-gray-800 dark:text-white">По email</div>
                <div className="text-xs text-gray-500">Код придёт на вашу почту</div>
              </div>
            </button>
          </div>
        )}

        {step === "telegram" && (
          <div className="mt-6">
            <div className="bg-blue-50 dark:bg-blue-900 rounded-xl p-6 text-center space-y-4">
              <div className="text-4xl">✈️</div>
              <p className="text-gray-700 dark:text-gray-200 font-medium">
                Откройте бот и введите ваш рабочий email
              </p>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition">{"Открыть @" + botUsername}</a>
              <p className="text-xs text-gray-400">
                Бот пришлёт 6-значный код — введите его ниже
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => { if (email) setStep("otp"); }}
                disabled={!email}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-40"
              >
                Я получил код
              </button>
            </div>
            <button
              onClick={() => setStep("choose")}
              className="mt-4 w-full text-gray-400 text-sm hover:underline"
            >
              ← Назад
            </button>
          </div>
        )}

        {step === "email" && (
          <div className="mt-6">
            <p className="text-gray-500 text-sm text-center mb-6">
              Введите email для получения кода
            </p>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? "Отправка..." : "Получить код"}
              </button>
            </form>
            <button
              onClick={() => setStep("choose")}
              className="mt-4 w-full text-gray-400 text-sm hover:underline"
            >
              ← Назад
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="mt-6">
            <p className="text-gray-500 text-sm text-center mb-6">
              Введите код из {email}
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-2xl tracking-widest font-mono"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? "Проверка..." : "Войти"}
              </button>
            </form>
            <button
              onClick={() => { setStep("choose"); setCode(""); setError(""); }}
              className="mt-4 w-full text-gray-400 text-sm hover:underline"
            >
              ← Назад
            </button>
          </div>
        )}

      </div>
    </div>
  );
}