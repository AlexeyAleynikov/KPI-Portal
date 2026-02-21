"use client";
import { useState } from "react";
import useSWR from "swr";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { kpiApi } from "@/lib/api";

const PERIODS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
];

export default function RatingChart() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSWR(
    ["kpi-history", days],
    () => kpiApi.getHistory(1, days).then((r) => r.data)  // indicator_id=1 — замените на нужный
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Динамика рейтинга</h3>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`text-xs px-3 py-1 rounded-full transition ${
                days === p.days
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2E5C8A"
              strokeWidth={2}
              dot={{ fill: "#2E5C8A", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
