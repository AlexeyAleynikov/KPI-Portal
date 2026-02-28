"use client";
import { useState, useEffect } from "react";

interface DimValue { id: number; value: string; }
interface Dimension { id: number; name: string; name_system: string; values: DimValue[]; }

export default function AdminDimensionsPage() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newDim, setNewDim] = useState({ name: "", name_system: "" });
  const [editDim, setEditDim] = useState<Dimension | null>(null);
  const [newValue, setNewValue] = useState<{ [dimId: number]: string }>({});
  const [editValue, setEditValue] = useState<DimValue | null>(null);
  const [editValueText, setEditValueText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(`/api/admin/${path}`, { credentials: "include", ...opts });

  const load = async () => {
    const data = await api("dimensions").then(r => r.json());
    setDimensions(data);
  };

  useEffect(() => { load(); }, []);

  const createDimension = async () => {
    if (!newDim.name || !newDim.name_system) return;
    setSaving(true); setError("");
    const r = await api("dimensions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDim),
    });
    if (r.ok) { setShowCreate(false); setNewDim({ name: "", name_system: "" }); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const updateDimension = async () => {
    if (!editDim) return;
    setSaving(true); setError("");
    const r = await api(`dimensions/${editDim.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editDim.name, name_system: editDim.name_system }),
    });
    if (r.ok) { setEditDim(null); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const deleteDimension = async (id: number) => {
    if (!confirm("Удалить измерение и все его значения?")) return;
    await api(`dimensions/${id}`, { method: "DELETE" });
    load();
  };

  const createValue = async (dimId: number) => {
    const val = newValue[dimId]?.trim();
    if (!val) return;
    const r = await api(`dimensions/${dimId}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: val }),
    });
    if (r.ok) { setNewValue(p => ({ ...p, [dimId]: "" })); load(); }
  };

  const updateValue = async () => {
    if (!editValue) return;
    await api(`dimensions/values/${editValue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValueText }),
    });
    setEditValue(null); load();
  };

  const deleteValue = async (id: number) => {
    if (!confirm("Удалить значение?")) return;
    await api(`dimensions/values/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Измерения (разрезы данных)</h2>
        <button onClick={() => setShowCreate(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Добавить измерение
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        Измерения позволяют отслеживать KPI по направлениям — например по продуктам (ККТ, СБИС, 1С) или каналам продаж.
      </p>

      {dimensions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-400">
          Нет измерений. Создайте первое — например "Продукт" со значениями ККТ, СБИС, 1С.
        </div>
      )}

      <div className="space-y-6">
        {dimensions.map(dim => (
          <div key={dim.id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            {/* Заголовок измерения */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-700">
              <div>
                <span className="font-semibold text-gray-800 dark:text-white">{dim.name}</span>
                <span className="ml-2 text-xs text-gray-400 font-mono">{dim.name_system}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setEditDim({ ...dim }); setError(""); }}
                  className="text-blue-500 hover:underline text-sm">Переименовать</button>
                <button onClick={() => deleteDimension(dim.id)}
                  className="text-red-500 hover:underline text-sm">Удалить</button>
              </div>
            </div>

            {/* Значения измерения */}
            <div className="px-5 py-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {dim.values.map(v => (
                  <div key={v.id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5">
                    {editValue?.id === v.id ? (
                      <>
                        <input value={editValueText} onChange={e => setEditValueText(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-0.5 w-32"
                          onKeyDown={e => e.key === "Enter" && updateValue()} />
                        <button onClick={updateValue} className="text-green-500 text-xs hover:underline">✓</button>
                        <button onClick={() => setEditValue(null)} className="text-gray-400 text-xs hover:underline">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-700 dark:text-gray-200">{v.value}</span>
                        <button onClick={() => { setEditValue(v); setEditValueText(v.value); }}
                          className="text-blue-400 hover:text-blue-600 text-xs ml-1">✎</button>
                        <button onClick={() => deleteValue(v.id)}
                          className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </>
                    )}
                  </div>
                ))}
                {dim.values.length === 0 && (
                  <span className="text-gray-400 text-sm">Нет значений</span>
                )}
              </div>

              {/* Добавить значение */}
              <div className="flex gap-2">
                <input
                  value={newValue[dim.id] || ""}
                  onChange={e => setNewValue(p => ({ ...p, [dim.id]: e.target.value }))}
                  placeholder="Новое значение (например: ККТ)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  onKeyDown={e => e.key === "Enter" && createValue(dim.id)}
                />
                <button onClick={() => createValue(dim.id)}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm transition">
                  Добавить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модал создания измерения */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Новое измерение</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Название (для отображения)</label>
                <input value={newDim.name} onChange={e => setNewDim(p => ({ ...p, name: e.target.value }))}
                  placeholder="Продукт" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Системное имя (латиница)</label>
                <input value={newDim.name_system} onChange={e => setNewDim(p => ({ ...p, name_system: e.target.value }))}
                  placeholder="product" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={createDimension} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модал редактирования измерения */}
      {editDim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Переименовать измерение</h3>
            <div className="space-y-3">
              <input value={editDim.name} onChange={e => setEditDim(p => p ? { ...p, name: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input value={editDim.name_system} onChange={e => setEditDim(p => p ? { ...p, name_system: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={updateDimension} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button onClick={() => setEditDim(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
