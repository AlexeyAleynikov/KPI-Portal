"use client";
import { useState, useEffect } from "react";

interface User { id: number; full_name: string; }
interface Policy {
  id: number; user_id: number | null; user_name: string | null;
  continent: string | null; country: string | null; city: string | null;
  can_view: boolean; can_edit: boolean;
  can_view_subordinates: boolean; can_edit_subordinates: boolean;
  edit_days_limit: number | null; edit_days_limit_subordinates: number | null; is_personal: boolean;
}

const emptyForm = {
  user_id: null as number | null, continent: "", country: "", city: "",
  can_view: true, can_edit: true, can_view_subordinates: false, can_edit_subordinates: false,
  edit_days_limit: null as number | null, edit_days_limit_subordinates: null as number | null, is_personal: false,
};

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const api = (path: string, opts?: RequestInit) =>
    fetch(`/api/admin/${path}`, { credentials: "include", ...opts });

  const load = async () => {
    const [pol, usr] = await Promise.all([
      api("policies").then(r => r.json()),
      api("users").then(r => r.json()),
    ]);
    setPolicies(pol); setUsers(usr);
  };

  useEffect(() => { load(); }, []);

  const scopeLabel = (p: Policy) => {
    if (p.is_personal && p.user_name) return p.user_name;
    const parts = [p.continent, p.country, p.city].filter(Boolean);
    return parts.length ? parts.join(" → ") : "Все пользователи (глобальная)";
  };

  const scopeIcon = (p: Policy) => {
    if (p.is_personal) return "👤";
    if (p.city) return "🏙";
    if (p.country) return "🏳";
    if (p.continent) return "🌍";
    return "🌐";
  };

  // Определяем тип области для подсказки
  const scopeType = () => {
    if (form.user_id) return "personal";
    if (form.city) return "city";
    if (form.country) return "country";
    if (form.continent) return "continent";
    return "global";
  };

  const scopeHint: Record<string, string> = {
    global: "Применяется ко всем пользователям. Перекрывается более специфичными политиками.",
    continent: "Применяется ко всем пользователям этого континента.",
    country: "Применяется ко всем пользователям этой страны.",
    city: "Применяется ко всем пользователям этого города.",
    personal: "Персональная политика — перекрывает все локационные политики для этого пользователя.",
  };

  const priorityOrder = ["personal", "city", "country", "continent", "global"];

  const save = async () => {
    setSaving(true); setError("");
    const body = { ...form, is_personal: !!form.user_id };
    const r = editPolicy
      ? await api(`policies/${editPolicy.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await api("policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { setShowCreate(false); setEditPolicy(null); setForm({ ...emptyForm }); load(); }
    else { try { const d = await r.json(); setError(typeof d.detail === "string" ? d.detail : "Ошибка"); } catch { setError("Ошибка"); } }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Удалить политику?")) return;
    await api(`policies/${id}`, { method: "DELETE" });
    load();
  };

  const openEdit = (p: Policy) => {
    setEditPolicy(p);
    setForm({ user_id: p.user_id, continent: p.continent || "", country: p.country || "",
      city: p.city || "", can_view: p.can_view, can_edit: p.can_edit,
      can_view_subordinates: p.can_view_subordinates, can_edit_subordinates: p.can_edit_subordinates,
      edit_days_limit: p.edit_days_limit, edit_days_limit_subordinates: p.edit_days_limit_subordinates, is_personal: p.is_personal });
  };

  // Группируем политики по типу
  const grouped = {
    personal: policies.filter(p => p.is_personal),
    city: policies.filter(p => !p.is_personal && p.city),
    country: policies.filter(p => !p.is_personal && !p.city && p.country),
    continent: policies.filter(p => !p.is_personal && !p.city && !p.country && p.continent),
    global: policies.filter(p => !p.is_personal && !p.city && !p.country && !p.continent),
  };

  const Check = ({ val }: { val: boolean }) => (
    <span className={val ? "text-green-500 font-bold" : "text-gray-300"}>
      {val ? "✓" : "✗"}
    </span>
  );

  const PolicyRow = ({ p }: { p: Policy }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span>{scopeIcon(p)}</span>
          <span className={`text-sm ${p.is_personal ? "font-medium text-brand-700" : "text-gray-700"}`}>
            {scopeLabel(p)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-center"><Check val={p.can_view} /></td>
      <td className="px-4 py-3 text-center"><Check val={p.can_edit} /></td>
      <td className="px-4 py-3 text-center"><Check val={p.can_view_subordinates} /></td>
      <td className="px-4 py-3 text-center"><Check val={p.can_edit_subordinates} /></td>
      <td className="px-4 py-3 text-center">
        {p.edit_days_limit
          ? <span className="text-orange-600 font-medium">{p.edit_days_limit} дн.</span>
          : <span className="text-gray-400">∞</span>}
      </td>
      <td className="px-4 py-3 text-right space-x-3">
        <button onClick={() => openEdit(p)} className="text-blue-500 hover:underline text-xs">Изменить</button>
        <button onClick={() => del(p.id)} className="text-red-500 hover:underline text-xs">Удалить</button>
      </td>
    </tr>
  );

  const GroupLabel: Record<string, string> = {
    global: "🌐 Глобальные (для всех)",
    continent: "🌍 По континенту",
    country: "🏳 По стране",
    city: "🏙 По городу",
    personal: "👤 Персональные",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Политики доступа к KPI</h2>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...emptyForm }); setError(""); }}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Добавить политику
        </button>
      </div>

      {/* Инструкция */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <div className="font-semibold mb-2">Как работают политики (приоритет от высшего к низшему):</div>
        <ol className="space-y-1 list-decimal list-inside text-blue-700">
          <li><strong>Персональная</strong> — назначена конкретному пользователю, перекрывает все остальные</li>
          <li><strong>По городу</strong> — для всех пользователей из этого города</li>
          <li><strong>По стране</strong> — для всех пользователей из этой страны</li>
          <li><strong>По континенту</strong> — для всех пользователей этого континента</li>
          <li><strong>Глобальная</strong> — для всех, кто не попал ни под одну другую политику</li>
        </ol>
        <div className="mt-2 text-blue-600">
          Пример: глобальная — 120 дней, Европа — 90 дней, Москва — 60 дней, Иванов — 30 дней.<br/>
          Для Иванова из Москвы применится политика с 30 днями (персональная имеет высший приоритет).
        </div>
      </div>

      {/* Таблицы по группам */}
      {priorityOrder.map(group => {
        const items = grouped[group as keyof typeof grouped];
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-600">
              {GroupLabel[group]}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left text-gray-500 font-normal">Область</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-normal">Просмотр</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-normal">Редактирование</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-normal">Просмотр подч.</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-normal">Ред. подч.</th>
                  <th className="px-4 py-2 text-center text-gray-500 font-normal">Лимит (свои)</th>
                      <th className="px-4 py-2 text-center text-gray-500 font-normal">Лимит (подч.)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(p => <PolicyRow key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
        );
      })}

      {policies.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          Нет политик. Создайте сначала глобальную политику для всех пользователей.
        </div>
      )}

      {/* Модал создания/редактирования */}
      {(showCreate || editPolicy) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">{editPolicy ? "Редактировать политику" : "Новая политика"}</h3>

            {/* Подсказка по текущей области */}
            <div className={`text-xs rounded-lg px-3 py-2 mb-4 ${
              scopeType() === "personal" ? "bg-brand-50 text-brand-700" : "bg-gray-50 text-gray-500"
            }`}>
              {scopeHint[scopeType()]}
            </div>

            <div className="space-y-4">
              {/* Область */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase">Область применения</div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">👤 Конкретный пользователь (персональная — наивысший приоритет)</label>
                  <select value={form.user_id ?? ""} onChange={e => setForm(p => ({ ...p, user_id: e.target.value ? +e.target.value : null, continent: "", country: "", city: "" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Не выбран (применять по локации)</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                {!form.user_id && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400">Или выберите локацию (оставьте пустым для глобальной политики):</div>
                    <input placeholder="🌍 Континент (например: Европа)" value={form.continent}
                      onChange={e => setForm(p => ({ ...p, continent: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input placeholder="🏳 Страна (например: Россия)" value={form.country}
                      onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input placeholder="🏙 Город (например: Москва)" value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}
              </div>

              {/* Права */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Права</div>

                {/* Свои KPI */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-600">Свои KPI</div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.can_view}
                      onChange={e => setForm(p => ({ ...p, can_view: e.target.checked, can_edit: e.target.checked ? p.can_edit : false }))}
                      className="w-4 h-4 rounded accent-brand-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-700">Просмотр своих KPI</div>
                      <div className="text-xs text-gray-400">Пользователь видит свои показатели на дашборде</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 ${!form.can_view ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={form.can_edit} disabled={!form.can_view}
                      onChange={e => setForm(p => ({ ...p, can_edit: e.target.checked, can_view: e.target.checked ? true : p.can_view }))}
                      className="w-4 h-4 rounded accent-brand-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-700">Редактирование своих KPI</div>
                      <div className="text-xs text-gray-400">Требует просмотр. Пользователь может вводить значения своих показателей</div>
                    </div>
                  </label>
                </div>

                {/* KPI подчинённых */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-600">KPI подчинённых</div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.can_view_subordinates}
                      onChange={e => setForm(p => ({ ...p, can_view_subordinates: e.target.checked, can_edit_subordinates: e.target.checked ? p.can_edit_subordinates : false }))}
                      className="w-4 h-4 rounded accent-brand-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-700">Просмотр KPI подчинённых</div>
                      <div className="text-xs text-gray-400">Руководитель видит показатели своих подчинённых</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 ${!form.can_view_subordinates ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={form.can_edit_subordinates} disabled={!form.can_view_subordinates}
                      onChange={e => setForm(p => ({ ...p, can_edit_subordinates: e.target.checked, can_view_subordinates: e.target.checked ? true : p.can_view_subordinates }))}
                      className="w-4 h-4 rounded accent-brand-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-700">Редактирование KPI подчинённых</div>
                      <div className="text-xs text-gray-400">Требует просмотр подчинённых. Руководитель может вводить значения за своих подчинённых</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Лимит дней */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase">Ограничения редактирования</div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Лимит для своих данных (дней назад)</label>
                  <input type="number" min="1" placeholder="Пусто = без ограничения"
                    value={form.edit_days_limit ?? ""}
                    onChange={e => setForm(p => ({ ...p, edit_days_limit: e.target.value ? +e.target.value : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  {form.edit_days_limit && (
                    <p className="text-xs text-orange-500 mt-1">
                      Нельзя редактировать свои данные старше {form.edit_days_limit} дн. от сегодня
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Лимит для данных подчинённых (дней назад)</label>
                  <input type="number" min="1" placeholder="Пусто = без ограничения"
                    value={form.edit_days_limit_subordinates ?? ""}
                    onChange={e => setForm(p => ({ ...p, edit_days_limit_subordinates: e.target.value ? +e.target.value : null }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  {form.edit_days_limit_subordinates && (
                    <p className="text-xs text-orange-500 mt-1">
                      Нельзя редактировать данные подчинённых старше {form.edit_days_limit_subordinates} дн. от сегодня
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button onClick={() => { setShowCreate(false); setEditPolicy(null); }}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
