"use client";
import { useState, useEffect } from "react";

interface User { id: number; full_name: string; email: string; manager_id: number | null; continent: string; country: string; city: string; is_active: boolean; }

export default function AdminHierarchyPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/admin/users", { credentials: "include" }).then(r => r.json()).then(setUsers);

  useEffect(() => { load(); }, []);

  const activeUsers = users.filter(u => u.is_active);
  const roots = activeUsers.filter(u => !u.manager_id);
  const getSubs = (id: number) => activeUsers.filter(u => u.manager_id === id);

  const saveManager = async () => {
    if (!editUser) return;
    setSaving(true); setError("");
    const r = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manager_id: editUser.manager_id }),
    });
    if (r.ok) { setEditUser(null); load(); }
    else { setError("Ошибка сохранения"); }
    setSaving(false);
  };

  const UserNode = ({ user, depth = 0 }: { user: User; depth?: number }) => {
    const subs = getSubs(user.id);
    const isSelected = selected?.id === user.id;
    return (
      <div>
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition cursor-pointer
          ${isSelected ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50"}`}
          style={{ marginLeft: depth * 20 }}
          onClick={() => setSelected(isSelected ? null : user)}>
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">{user.full_name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
          {subs.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">{subs.length} подч.</span>
          )}
          <button onClick={e => { e.stopPropagation(); setEditUser({ ...user }); setError(""); }}
            className="text-xs text-blue-500 hover:underline flex-shrink-0">Изменить</button>
        </div>
        {subs.map(s => <UserNode key={s.id} user={s} depth={depth + 1} />)}
      </div>
    );
  };

  // Пользователи чей руководитель не найден в активных
  const orphans = activeUsers.filter(u => u.manager_id && !activeUsers.find(m => m.id === u.manager_id));

  return (
    <div className="flex gap-6">
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Иерархия сотрудников</h2>
          <span className="text-xs text-gray-400">{activeUsers.length} активных</span>
        </div>

        {roots.length === 0 && orphans.length === 0 ? (
          <p className="text-gray-400 text-sm">Нет пользователей. Сначала создайте их в разделе Пользователи.</p>
        ) : (
          <>
            {roots.map(u => <UserNode key={u.id} user={u} />)}
            {orphans.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="text-xs text-orange-500 mb-2">⚠ Руководитель не найден:</div>
                {orphans.map(u => <UserNode key={u.id} user={u} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Карточка выбранного */}
      {selected && (
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow p-5 h-fit sticky top-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xl font-bold mx-auto mb-3">
            {selected.full_name.charAt(0)}
          </div>
          <h3 className="font-bold text-center text-gray-800 text-sm mb-1">{selected.full_name}</h3>
          <p className="text-gray-400 text-xs text-center mb-4">{selected.email}</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Руководитель</span><span className="font-medium">{activeUsers.find(u => u.id === selected.manager_id)?.full_name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Подчинённых</span><span className="font-medium">{getSubs(selected.id).length}</span></div>
            {selected.continent && <div className="flex justify-between"><span className="text-gray-500">Континент</span><span>{selected.continent}</span></div>}
            {selected.country && <div className="flex justify-between"><span className="text-gray-500">Страна</span><span>{selected.country}</span></div>}
            {selected.city && <div className="flex justify-between"><span className="text-gray-500">Город</span><span>{selected.city}</span></div>}
          </div>
          <button onClick={() => { setEditUser({ ...selected }); setError(""); }}
            className="mt-4 w-full bg-brand-500 text-white py-1.5 rounded-lg text-xs">
            Назначить руководителя
          </button>
        </div>
      )}

      {/* Модал изменения руководителя */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-1">Изменить руководителя</h3>
            <p className="text-gray-500 text-sm mb-4">{editUser.full_name}</p>
            <label className="text-xs text-gray-500 mb-1 block">Руководитель</label>
            <select value={editUser.manager_id ?? ""}
              onChange={e => setEditUser(p => p ? { ...p, manager_id: e.target.value ? +e.target.value : null } : p)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4">
              <option value="">Нет руководителя (топ-уровень)</option>
              {activeUsers.filter(u => u.id !== editUser.id).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={saveManager} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
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
