"use client";
import useSWR from "swr";
import { kpiApi } from "@/lib/api";
import KpiCard from "@/components/dashboard/KpiCard";
import RatingChart from "@/components/dashboard/RatingChart";
import LinksSection from "@/components/dashboard/LinksSection";
import { useAuthStore } from "@/store/auth";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: kpiData, isLoading } = useSWR("kpi-dashboard", () =>
    kpiApi.getDashboard().then((r) => r.data)
  );

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Добро пожаловать</p>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white font-mono">
            {user?.display_name}
          </h2>
        </div>
        {kpiData?.rating !== null && kpiData?.rating !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow px-6 py-3 text-center">
            <p className="text-xs text-gray-500">Рейтинг</p>
            <p className="text-3xl font-bold text-brand-500">{kpiData.rating}%</p>
          </div>
        )}
      </div>

      {/* KPI карточки */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpiData?.indicators?.map((ind: any) => (
            <KpiCard key={ind.indicator_id} indicator={ind} />
          ))}
        </div>
      )}

      {/* График динамики */}
      <RatingChart />

      {/* Рабочие инструменты */}
      <LinksSection />
    </div>
  );
}
