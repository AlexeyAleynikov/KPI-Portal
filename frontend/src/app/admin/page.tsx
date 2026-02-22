"use client";
import Link from "next/link";

const sections = [
  { href: "/admin/users", icon: "👥", title: "Пользователи и роли", desc: "Создание, редактирование, назначение ролей" },
  { href: "/admin/links", icon: "🔗", title: "Ссылки", desc: "Управление разделами и ссылками портала" },
  { href: "/admin/kpi", icon: "📊", title: "KPI / Показатели", desc: "Показатели, планы, источники данных" },
];

export default function AdminPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
        Панель администратора
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-md transition block"
          >
            <div className="text-4xl mb-4">{s.icon}</div>
            <div className="font-semibold text-gray-800 dark:text-white mb-1">{s.title}</div>
            <div className="text-sm text-gray-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
