"use client";
import { useState, useEffect } from "react";

interface GeoItem { id: number; name: string; continent_id?: number; }

type Tab = "continents" | "countries" | "cities";

export default function AdminGeoPage() {
  const [tab, setTab] = useState<Tab>("continents");
  const [continents, setContinents] = useState<GeoItem[]>([]);
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);
  const [filterContinent, setFilterContinent] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newContinentId, setNewContinentId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<GeoItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(`/api/admin/geo/${path}`, { credentials: "include", ...opts });

  const loadAll = async () => {
    const [c, co, ci] = await Promise.all([
      api("continents").then(r => r.json()),
      api("countries").then(r => r.json()),
      api("cities").then(r => r.json()),
    ]);
    setContinents(c); setCountries(co); setCities(ci);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true); setError("");
    let url = "";
    let body: Record<string, string | number> = { name: newName };
    if (tab === "continents") url = "continents";
    else if (tab === "countries") url = "countries";
    else { url = "cities"; if (!newContinentId) { setError("Выберите континент"); setSaving(false); return; } body.continent_id = newContinentId; }

    const params = new URLSearchParams(body as Record<string, string>).toString();
    const r = await api(`${url}?${params}`, { method: "POST" });
    if (r.ok) { setNewName(""); setNewContinentId(null); loadAll(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setSaving(true); setError("");
    let url = "";
    let params: Record<string, string | number> = { name: editItem.name };
    if (tab === "continents") url = `continents/${editItem.id}`;
    else if (tab === "countries") url = `countries/${editItem.id}`;
    else { url = `cities/${editItem.id}`; params.continent_id = editItem.continent_id!; }

    const r = await api(`${url}?${new URLSearchParams(params as Record<string, string>).toString()}`, { method: "PATCH" });
    if (r.ok) { setEditItem(null); loadAll(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить?")) return;
    let url = tab === "continents" ? `continents/${id}` : tab === "countries" ? `countries/${id}` : `cities/${id}`;
    await api(url, { method: "DELETE" });
    loadAll();
  };

  const items = tab === "continents" ? continents : tab === "countries" ? countries :
    filterContinent ? cities.filter(c => c.continent_id === filterContinent) : cities;

  const tabs: { key: Tab; label: string }[] = [
    { key: "continents", label: "Континенты" },
    { key: "countries", label: "Страны" },
    { key: "cities", label: "Города" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Гео-справочники</h2>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Фильтр городов по континенту */}
      {tab === "cities" && (
        <select value={filterContinent ?? ""} onChange={e => setFilterContinent(e.target.value ? +e.target.value : null)}
          className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm w-64">
          <option value="">Все континенты</option>
          {continents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {/* Форма добавления */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Название</label>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={tab === "continents" ? "Европа" : tab === "countries" ? "Россия" : "Москва"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
        </div>
        {tab === "cities" && (
          <div className="w-48">
            <label className="text-xs text-gray-500 mb-1 block">Континент</label>
            <select value={newContinentId ?? ""} onChange={e => setNewContinentId(+e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Выберите...</option>
              {continents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={handleCreate} disabled={saving}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
          + Добавить
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* Список */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Название</th>
              {tab === "cities" && <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Континент</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-800 dark:text-white">{item.name}</td>
                {tab === "cities" && (
                  <td className="px-4 py-3 text-gray-500">
                    {continents.find(c => c.id === item.continent_id)?.name || "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => { setEditItem({ ...item }); setError(""); }}
                    className="text-blue-500 hover:underline text-xs">Изменить</button>
                  <button onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:underline text-xs">Удалить</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Нет записей</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модал редактирования */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg mb-4">Редактировать</h3>
            <input value={editItem.name} onChange={e => setEditItem(p => p ? { ...p, name: e.target.value } : p)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3" />
            {tab === "cities" && (
              <select value={editItem.continent_id ?? ""}
                onChange={e => setEditItem(p => p ? { ...p, continent_id: +e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3">
                {continents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button onClick={() => setEditItem(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
