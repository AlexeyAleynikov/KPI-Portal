"use client";
import { useState, useEffect } from "react";

interface GeoItem { id: number; name: string; continent_id?: number; }

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  continent: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean;
  otp_channel: string;
  manager_id: number | null;
}

const ROLES = ["employee", "manager", "admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", city: "", country: "", continent: "", role: "employee" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [continents, setContinents] = useState<GeoItem[]>([]);
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/users", { credentials: "include" });
    const data = await r.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/admin/geo/continents", { credentials: "include" }).then(r => r.json()).then(setContinents).catch(() => {});
    fetch("/api/admin/geo/countries", { credentials: "include" }).then(r => r.json()).then(setCountries).catch(() => {});
    fetch("/api/admin/geo/cities", { credentials: "include" }).then(r => r.json()).then(setCities).catch(() => {});
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/users/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setShowCreate(false); setForm({ email: "", full_name: "", city: "", country: "", continent: "", role: "employee" }); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSaving(true); setError("");
    const r = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: editUser.full_name,
        city: editUser.city,
        country: editUser.country,
        continent: editUser.continent,
        role: editUser.role,
        otp_channel: editUser.otp_channel,
        manager_id: editUser.manager_id,
      }),
    });
    if (r.ok) { setEditUser(null); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Деактивировать пользователя?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Пользователи</h2>
        <button onClick={() => setShowCreate(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Добавить
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Поиск по имени или email..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {loading ? <p className="text-gray-500">Загрузка...</p> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Пользователь</th>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Локация</th>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Роль</th>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Статус</th>
                <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">OTP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 dark:text-white">{u.full_name}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {[u.continent, u.country, u.city].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === "admin" ? "bg-red-100 text-red-700" :
                      u.role === "manager" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {u.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.otp_channel}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditUser(u); setError(""); }}
                      className="text-blue-500 hover:underline text-xs">Изменить</button>
                    {u.is_active && (
                      <button onClick={() => handleDeactivate(u.id)}
                        className="text-red-500 hover:underline text-xs">Деактивировать</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модал создания */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Новый пользователь</h3>
            <div className="space-y-3">
              <input placeholder="Email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input placeholder="Полное имя" value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <select value={form.continent} onChange={e => setForm(p => ({ ...p, continent: e.target.value, country: "", city: "" }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Континент...</option>
                {continents.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Страна...</option>
                {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Город...</option>
                {cities.filter(c => !form.continent || continents.find(ct => ct.name === form.continent && c.continent_id === ct.id)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модал редактирования */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Редактировать пользователя</h3>
            <div className="space-y-3">
              <input placeholder="Полное имя" value={editUser.full_name || ""}
                onChange={e => setEditUser(p => p ? { ...p, full_name: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <select value={editUser.continent || ""}
                onChange={e => setEditUser(p => p ? { ...p, continent: e.target.value, city: "" } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Континент...</option>
                {continents.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={editUser.country || ""}
                onChange={e => setEditUser(p => p ? { ...p, country: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Страна...</option>
                {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={editUser.city || ""}
                onChange={e => setEditUser(p => p ? { ...p, city: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Город...</option>
                {cities.filter(c => !editUser.continent || continents.find(ct => ct.name === editUser.continent && c.continent_id === ct.id)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={editUser.role}
                onChange={e => setEditUser(p => p ? { ...p, role: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={editUser.otp_channel}
                onChange={e => setEditUser(p => p ? { ...p, otp_channel: e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="log">Log (dev)</option>
              </select>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Руководитель</label>
                <select value={editUser.manager_id ?? ""}
                  onChange={e => setEditUser(p => p ? { ...p, manager_id: e.target.value ? +e.target.value : null } : p)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Нет руководителя (топ-уровень)</option>
                  {users.filter(u => u.id !== editUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}