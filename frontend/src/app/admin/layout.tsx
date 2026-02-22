"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.role !== "admin") {
          router.replace("/dashboard");
        } else {
          setLoading(false);
        }
      })
      .catch(() => router.replace("/auth/login"));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Проверка прав...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Шапка */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              Администрирование
            </h1>
            <nav className="flex gap-4">
              <Link href="/admin/users" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 transition">
                Пользователи
              </Link>
              <Link href="/admin/links" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 transition">
                Ссылки
              </Link>
              <Link href="/admin/kpi" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 transition">
                KPI
              </Link>
              <Link href="/admin/geo" className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 transition">
                Справочники
              </Link>
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Дашборд
          </Link>
        </div>
      </header>

      {/* Контент */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
