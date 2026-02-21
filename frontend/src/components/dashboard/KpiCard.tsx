import clsx from "clsx";

interface Indicator {
  indicator_id: number;
  name: string;
  actual: number | null;
  plan: number | null;
  percent: number | null;
  color: "green" | "yellow" | "red" | "gray";
  value_type: string;
  weight: number;
}

export default function KpiCard({ indicator }: { indicator: Indicator }) {
  const colorMap = {
    green: "bg-green-50 border-green-200 dark:bg-green-900/20",
    yellow: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20",
    red: "bg-red-50 border-red-200 dark:bg-red-900/20",
    gray: "bg-gray-50 border-gray-200 dark:bg-gray-800",
  };
  const badgeColor = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };
  const arrow = indicator.percent === null ? "–" : indicator.percent >= 100 ? "↑" : "↓";
  const arrowColor = indicator.percent === null ? "text-gray-400" : indicator.percent >= 100 ? "text-green-600" : "text-red-500";

  return (
    <div className={clsx("rounded-xl border p-5 shadow-sm", colorMap[indicator.color])}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{indicator.name}</span>
        <span className={clsx("w-2.5 h-2.5 rounded-full mt-1", badgeColor[indicator.color])} />
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {indicator.actual !== null ? indicator.actual : "—"}
          {indicator.value_type === "percent" && "%"}
        </span>
        <span className={clsx("text-lg font-semibold pb-0.5", arrowColor)}>{arrow}</span>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>план: {indicator.plan ?? "—"}{indicator.value_type === "percent" && "%"}</span>
        <span>{indicator.percent !== null ? `${indicator.percent}%` : ""}</span>
      </div>

      {/* Прогресс-бар */}
      {indicator.percent !== null && (
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", badgeColor[indicator.color])}
            style={{ width: `${Math.min(indicator.percent, 100)}%` }}
          />
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">Вес: {indicator.weight}%</p>
    </div>
  );
}
