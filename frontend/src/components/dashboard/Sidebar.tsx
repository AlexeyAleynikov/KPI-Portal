"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Users, BarChart2, LogOut } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard, roles: ["employee", "manager", "admin"] },
  { href: "/dashboard/team", label: "Команда", icon: Users, roles: ["manager", "admin"] },
  { href: "/admin", label: "Администрирование", icon: Settings, roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filtered = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className="w-60 bg-brand-600 flex flex-col h-full">
      <div className="p-6 border-b border-brand-500">
        <p className="text-white font-bold text-lg">Портал</p>
        <p className="text-blue-200 text-xs mt-0.5 font-mono truncate">{user?.display_name}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {filtered.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
                active
                  ? "bg-white/20 text-white font-semibold"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-brand-500">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-blue-100 hover:bg-white/10 hover:text-white text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
