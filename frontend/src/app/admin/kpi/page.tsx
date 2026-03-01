"use client";
import { useState, useEffect } from "react";

type Tab = "indicators" | "targets" | "values";

interface Indicator { id: number; name_display: string; name_system: string; source_type: string; value_type: string; period_type: string; formula?: string; }
interface User { id: number; full_name: string; email: string; }
interface Target { id: number; user_id: number; indicator_id: number; period_start: string; period_end: string; target_value: number; }
interface Value { id: number; user_id: number; indicator_id: number; date: string; value: number; dimension_value_id?: number; }
interface DimValue { id: number; value: string; }
interface Dimension { id: number; name: string; name_system: string; values: DimValue[]; }

const PERIOD_TYPES = [
  {v:"constant", l:"Константа (не меняется)"},
  {v:"day",      l:"За день"},
  {v:"week",     l:"За неделю"},
  {v:"decade",   l:"За декаду"},
  {v:"month",    l:"За месяц"},
  {v:"quarter",  l:"За квартал"},
  {v:"year",     l:"За год"},
  {v:"on_date",  l:"На дату"},
];

const SOURCE_TYPES = [{v:"manual",l:"Ручной ввод"},{v:"computed",l:"Вычисляемый (формула)"},{v:"rest_api",l:"REST API"},{v:"database",l:"База данных"},{v:"csv",l:"CSV файл"},{v:"xlsx",l:"Excel файл"},{v:"webhook",l:"Webhook"}];
const VALUE_TYPES = [{v:"number",l:"Число"},{v:"percent",l:"Процент"},{v:"boolean",l:"Да/Нет"},{v:"time",l:"Время"}];

export default function AdminKpiPage() {
  const [tab, setTab] = useState<Tab>("indicators");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [values, setValues] = useState<Value[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [editItem, setEditItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(`/api/admin/${path}`, { credentials: "include", ...opts });

  const load = async () => {
    const [ind, usr, dims] = await Promise.all([
      api("indicators").then(r => r.json()),
      api("users").then(r => r.json()),
      api("dimensions").then(r => r.json()),
    ]);
    setIndicators(ind); setUsers(usr); setDimensions(dims);
    loadTabData(tab, filterUserId);
  };

  const loadTabData = async (t: Tab, uid: number | null) => {
    if (t === "targets") {
      const url = uid ? `targets?user_id=${uid}` : "targets";
      const data = await api(url).then(r => r.json());
      setTargets(data);
    } else if (t === "values") {
      const url = uid ? `values?user_id=${uid}` : "values";
      const data = await api(url).then(r => r.json());
      setValues(data);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadTabData(tab, filterUserId); }, [tab, filterUserId]);

  const userName = (id: number) => users.find(u => u.id === id)?.full_name || `#${id}`;
  const indName = (id: number) => indicators.find(i => i.id === id)?.name_display || `#${id}`;

  const handleCreate = async () => {
    setSaving(true); setError("");
    const endpoint = tab === "indicators" ? "indicators" : tab === "targets" ? "targets" : "values";
    const r = await api(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setShowCreate(false); setForm({}); load(); }
    else { try { const d = await r.json(); setError(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail)); } catch { setError("Ошибка"); } }
    setSaving(false);
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    const endpoint = tab === "indicators" ? `indicators/${editItem.id}` : tab === "targets" ? `targets/${editItem.id}` : `values/${editItem.id}`;
    const method = tab === "indicators" ? "PATCH" : "PATCH";
    const r = await api(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editItem),
    });
    if (r.ok) { setEditItem(null); load(); }
    else { try { const d = await r.json(); setError(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail)); } catch { setError("Ошибка"); } }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить?")) return;
    const endpoint = tab === "indicators" ? `indicators/${id}` : tab === "targets" ? `targets/${id}` : `values/${id}`;
    await api(endpoint, { method: "DELETE" });
    load();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "indicators", label: "Показатели" },
    { key: "targets", label: "Планы" },
    { key: "values", label: "Значения" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Управление KPI</h2>

      {/* Вкладки */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(""); setShowCreate(false); setEditItem(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 border border-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Фильтр по пользователю для планов и значений */}
      {(tab === "targets" || tab === "values") && (
        <select value={filterUserId ?? ""} onChange={e => setFilterUserId(e.target.value ? +e.target.value : null)}
          className="mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm w-64">
          <option value="">Все пользователи</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      )}

      {/* Кнопка добавить */}
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowCreate(true); setForm(tab === "indicators" ? { name_display: "", name_system: "", value_type: "number", source_type: "manual" } : tab === "targets" ? { user_id: "", indicator_id: "", period_start: "", period_end: "", target_value: "" } : { user_id: "", indicator_id: "", date: "", value: "" }); setError(""); }}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Добавить
        </button>
      </div>

      {/* ── Таблица показателей ── */}
      {tab === "indicators" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Название</th>
                <th className="px-4 py-3 text-left text-gray-600">Системное имя</th>
                <th className="px-4 py-3 text-left text-gray-600">Тип значения</th>
                <th className="px-4 py-3 text-left text-gray-600">Источник</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {indicators.map(ind => (
                <tr key={ind.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{ind.name_display}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ind.name_system}</td>
                  <td className="px-4 py-3 text-gray-600">{ind.value_type}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{PERIOD_TYPES.find((p: any) => p.v === ind.period_type)?.l || ind.period_type}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${ind.source_type === "manual" ? "bg-gray-100 text-gray-600" : ind.source_type === "computed" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{SOURCE_TYPES.find((s: any) => s.v === ind.source_type)?.l || ind.source_type}</span></td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => { setEditItem({ ...ind }); setError(""); }} className="text-blue-500 hover:underline text-xs">Изменить</button>
                    <button onClick={() => handleDelete(ind.id)} className="text-red-500 hover:underline text-xs">Удалить</button>
                  </td>
                </tr>
              ))}
              {indicators.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Нет показателей</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Таблица планов ── */}
      {tab === "targets" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Пользователь</th>
                <th className="px-4 py-3 text-left text-gray-600">Показатель</th>
                <th className="px-4 py-3 text-left text-gray-600">Период</th>
                <th className="px-4 py-3 text-left text-gray-600">План</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {targets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{userName(t.user_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{indName(t.indicator_id)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.period_start} — {t.period_end}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.target_value}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => { setEditItem({ ...t }); setError(""); }} className="text-blue-500 hover:underline text-xs">Изменить</button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline text-xs">Удалить</button>
                  </td>
                </tr>
              ))}
              {targets.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Нет планов</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Таблица значений ── */}
      {tab === "values" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">Пользователь</th>
                <th className="px-4 py-3 text-left text-gray-600">Показатель</th>
                <th className="px-4 py-3 text-left text-gray-600">Дата</th>
                <th className="px-4 py-3 text-left text-gray-600">Значение</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {values.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{userName(v.user_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{indName(v.indicator_id)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{v.value}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => { setEditItem({ ...v }); setError(""); }} className="text-blue-500 hover:underline text-xs">Изменить</button>
                    <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:underline text-xs">Удалить</button>
                  </td>
                </tr>
              ))}
              {values.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Нет значений</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Модал создания ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">
              {tab === "indicators" ? "Новый показатель" : tab === "targets" ? "Новый план" : "Новое значение"}
            </h3>
            <div className="space-y-3">
              {tab === "indicators" && <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Название для отображения</label>
                  <input placeholder="Выручка общая" value={form.name_display || ""}
                    onChange={e => setForm((p: any) => ({ ...p, name_display: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Системное имя (латиница, без пробелов)</label>
                  <input placeholder="revenue_total" value={form.name_system || ""}
                    onChange={e => setForm((p: any) => ({ ...p, name_system: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип значения</label>
                  <select value={form.value_type || "number"} onChange={e => setForm((p: any) => ({ ...p, value_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {VALUE_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Периодичность</label>
                  <select value={form.period_type || "month"} onChange={e => setForm((p: any) => ({ ...p, period_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {PERIOD_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Источник данных</label>
                  <select value={form.source_type || "manual"} onChange={e => setForm((p: any) => ({ ...p, source_type: e.target.value, formula: "" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {SOURCE_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                {form.source_type === "computed" && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-blue-700 mb-2 block">Формула вычисления</label>
                    <input
                      value={form.formula || ""}
                      onChange={e => setForm((p: any) => ({ ...p, formula: e.target.value }))}
                      placeholder="Пример: {Sale_of_goods_Revenue} + {Sale_of_rights_Revenue}"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono bg-white mb-2" />
                    <div className="text-xs text-blue-600 mb-2">Нажмите на показатель чтобы добавить в формулу:</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {["+", "-", "*", "/", "(", ")", "100"].map(op => (
                        <button key={op} type="button"
                          onClick={() => setForm((p: any) => ({ ...p, formula: (p.formula || "") + op }))}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-mono">{op}</button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {indicators.map((i: any) => (
                        <button key={i.id} type="button"
                          onClick={() => setForm((p: any) => ({ ...p, formula: (p.formula || "") + "{" + i.name_system + "}" }))}
                          className="px-2 py-1 bg-white border border-blue-300 hover:bg-blue-100 rounded text-xs">
                          {i.name_display}
                        </button>
                      ))}
                    </div>
                    {form.formula && (
                      <button type="button" onClick={() => setForm((p: any) => ({ ...p, formula: "" }))}
                        className="mt-2 text-xs text-red-500 hover:underline">Очистить формулу</button>
                    )}
                  </div>
                )}
              </>}
              {(tab === "targets" || tab === "values") && <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Пользователь (оставьте пустым — пользователь введёт сам)</label>
                  <select value={form.user_id || ""} onChange={e => setForm((p: any) => ({ ...p, user_id: e.target.value ? +e.target.value : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Пользователь вводит сам</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <select value={form.indicator_id || ""} onChange={e => setForm((p: any) => ({ ...p, indicator_id: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Выберите показатель...</option>
                  {indicators.map(i => <option key={i.id} value={i.id}>{i.name_display}</option>)}
                </select>
              </>}
              {tab === "targets" && <>
                <input type="date" placeholder="Начало периода" value={form.period_start || ""}
                  onChange={e => setForm((p: any) => ({ ...p, period_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" placeholder="Конец периода" value={form.period_end || ""}
                  onChange={e => setForm((p: any) => ({ ...p, period_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="number" placeholder="Плановое значение" value={form.target_value || ""}
                  onChange={e => setForm((p: any) => ({ ...p, target_value: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </>}
              {tab === "values" && <>
                <input type="date" value={form.date || ""}
                  onChange={e => setForm((p: any) => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Разрез (необязательно — пусто = общий итог)</label>
                  <select value={form.dimension_value_id || ""}
                    onChange={e => setForm((p: any) => ({ ...p, dimension_value_id: e.target.value ? +e.target.value : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Общий итог (без разреза)</option>
                    {dimensions.map((d: Dimension) => (
                      <optgroup key={d.id} label={d.name}>
                        {d.values.map((v: DimValue) => <option key={v.id} value={v.id}>{v.value}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <input type="number" placeholder="Значение" value={form.value || ""}
                  onChange={e => setForm((p: any) => ({ ...p, value: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </>}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модал редактирования ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Редактировать</h3>
            <div className="space-y-3">
              {tab === "indicators" && <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Название для отображения</label>
                  <input value={editItem.name_display || ""}
                    onChange={e => setEditItem((p: any) => ({ ...p, name_display: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Системное имя</label>
                  <input value={editItem.name_system || ""}
                    onChange={e => setEditItem((p: any) => ({ ...p, name_system: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Тип значения</label>
                  <select value={editItem.value_type || "number"} onChange={e => setEditItem((p: any) => ({ ...p, value_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {VALUE_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Периодичность</label>
                  <select value={editItem.period_type || "month"} onChange={e => setEditItem((p: any) => ({ ...p, period_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {PERIOD_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Источник данных</label>
                  <select value={editItem.source_type || "manual"} onChange={e => setEditItem((p: any) => ({ ...p, source_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {SOURCE_TYPES.map((t: any) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                {editItem.source_type === "computed" && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-blue-700 mb-2 block">Формула вычисления</label>
                    <input
                      value={editItem.formula || ""}
                      onChange={e => setEditItem((p: any) => ({ ...p, formula: e.target.value }))}
                      placeholder="Пример: {revenue_goods} + {revenue_services}"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono bg-white mb-2" />
                    <div className="text-xs text-blue-600 mb-2">Нажмите на показатель чтобы добавить в формулу:</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {["+", "-", "*", "/", "(", ")", "100"].map(op => (
                        <button key={op} type="button"
                          onClick={() => setEditItem((p: any) => ({ ...p, formula: (p.formula || "") + op }))}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-mono">{op}</button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {indicators.filter((i: any) => i.id !== editItem.id).map((i: any) => (
                        <button key={i.id} type="button"
                          onClick={() => setEditItem((p: any) => ({ ...p, formula: (p.formula || "") + "{" + i.name_system + "}" }))}
                          className="px-2 py-1 bg-white border border-blue-300 hover:bg-blue-100 rounded text-xs">
                          {i.name_display}
                        </button>
                      ))}
                    </div>
                    {editItem.formula && (
                      <button type="button" onClick={() => setEditItem((p: any) => ({ ...p, formula: "" }))}
                        className="mt-2 text-xs text-red-500 hover:underline">Очистить формулу</button>
                    )}
                  </div>
                )}
              </>}
              {tab === "targets" && <>
                <select value={editItem.user_id || ""} onChange={e => setEditItem((p: any) => ({ ...p, user_id: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                <select value={editItem.indicator_id || ""} onChange={e => setEditItem((p: any) => ({ ...p, indicator_id: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {indicators.map(i => <option key={i.id} value={i.id}>{i.name_display}</option>)}
                </select>
                <input type="date" value={editItem.period_start || ""}
                  onChange={e => setEditItem((p: any) => ({ ...p, period_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="date" value={editItem.period_end || ""}
                  onChange={e => setEditItem((p: any) => ({ ...p, period_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="number" value={editItem.target_value || ""}
                  onChange={e => setEditItem((p: any) => ({ ...p, target_value: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </>}
              {tab === "values" && <>
                <select value={editItem.user_id || ""} onChange={e => setEditItem((p: any) => ({ ...p, user_id: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                <select value={editItem.indicator_id || ""} onChange={e => setEditItem((p: any) => ({ ...p, indicator_id: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {indicators.map(i => <option key={i.id} value={i.id}>{i.name_display}</option>)}
                </select>
                <input type="date" value={editItem.date || ""}
                  onChange={e => setEditItem((p: any) => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input type="number" value={editItem.value || ""}
                  onChange={e => setEditItem((p: any) => ({ ...p, value: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </>}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
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