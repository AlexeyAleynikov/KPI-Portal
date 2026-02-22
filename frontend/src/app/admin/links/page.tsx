"use client";
import { useState, useEffect } from "react";

interface Link { id: number; name: string; url: string; icon: string | null; description: string | null; open_in_iframe: boolean; order: number; section_id: number; is_active?: boolean; }
interface Section { id: number; name: string; icon: string | null; order: number; is_global: boolean; links: Link[]; }

export default function AdminLinksPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [editLink, setEditLink] = useState<Link | null>(null);
  const [showCreateLink, setShowCreateLink] = useState<number | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: "", icon: "", order: 0, is_global: true });
  const [linkForm, setLinkForm] = useState({ name: "", url: "", icon: "", description: "", open_in_iframe: false, order: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/links/", { credentials: "include" });
    const data = await r.json();
    setSections(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createSection = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/admin/sections", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sectionForm),
    });
    if (r.ok) { setShowCreateSection(false); setSectionForm({ name: "", icon: "", order: 0, is_global: true }); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const deleteSection = async (id: number) => {
    if (!confirm("Удалить раздел и все ссылки в нём?")) return;
    await fetch(`/api/admin/sections/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const createLink = async (section_id: number) => {
    setSaving(true); setError("");
    const r = await fetch("/api/admin/links", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...linkForm, section_id }),
    });
    if (r.ok) { setShowCreateLink(null); setLinkForm({ name: "", url: "", icon: "", description: "", open_in_iframe: false, order: 0 }); load(); }
    else { const d = await r.json(); setError(d.detail || "Ошибка"); }
    setSaving(false);
  };

  const updateLink = async () => {
    if (!editLink) return;
    setSaving(true); setError("");
    const r = await fetch(`/api/admin/links/${editLink.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editLink),
    });
    if (r.ok) { setEditLink(null); load(); }
    else { try { const d = await r.json(); setError(typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail)); } catch { setError("Ошибка сервера"); } }
    setSaving(false);
  };

  const deleteLink = async (id: number) => {
    if (!confirm("Удалить ссылку?")) return;
    await fetch(`/api/admin/links/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Разделы и ссылки</h2>
        <button onClick={() => setShowCreateSection(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Добавить раздел
        </button>
      </div>

      {loading ? <p className="text-gray-500">Загрузка...</p> : (
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              {/* Заголовок раздела */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  {section.icon && <span className="text-xl">{section.icon}</span>}
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-white">{section.name}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${section.is_global ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {section.is_global ? "Глобальный" : "Ролевой"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreateLink(section.id)}
                    className="text-brand-500 hover:underline text-sm">+ Ссылка</button>
                  <button onClick={() => deleteSection(section.id)}
                    className="text-red-500 hover:underline text-sm">Удалить раздел</button>
                </div>
              </div>

              {/* Ссылки */}
              {section.links.length === 0 ? (
                <p className="px-5 py-4 text-gray-400 text-sm">Нет ссылок</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-5 py-2 text-left text-gray-500 font-medium">Название</th>
                      <th className="px-5 py-2 text-left text-gray-500 font-medium">URL</th>
                      <th className="px-5 py-2 text-left text-gray-500 font-medium">iframe</th>
                      <th className="px-5 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {section.links.map(link => (
                      <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {link.icon && <span>{link.icon}</span>}
                            <span className="text-gray-800 dark:text-white">{link.name}</span>
                          </div>
                          {link.description && <div className="text-xs text-gray-400">{link.description}</div>}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">{link.url}</td>
                        <td className="px-5 py-3 text-gray-500">{link.open_in_iframe ? "✓" : "—"}</td>
                        <td className="px-5 py-3 text-right space-x-3">
                          <button onClick={() => { setEditLink(link); setError(""); }}
                            className="text-blue-500 hover:underline text-xs">Изменить</button>
                          <button onClick={() => deleteLink(link.id)}
                            className="text-red-500 hover:underline text-xs">Удалить</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модал создания раздела */}
      {showCreateSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Новый раздел</h3>
            <div className="space-y-3">
              <input placeholder="Название" value={sectionForm.name}
                onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input placeholder="Иконка (эмодзи)" value={sectionForm.icon}
                onChange={e => setSectionForm(p => ({ ...p, icon: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" placeholder="Порядок" value={sectionForm.order}
                onChange={e => setSectionForm(p => ({ ...p, order: +e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sectionForm.is_global}
                  onChange={e => setSectionForm(p => ({ ...p, is_global: e.target.checked }))} />
                Глобальный (виден всем)
              </label>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={createSection} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreateSection(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модал создания ссылки */}
      {showCreateLink !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Новая ссылка</h3>
            <div className="space-y-3">
              {[["name","Название"],["url","URL"],["icon","Иконка (эмодзи)"],["description","Описание"]].map(([f, label]) => (
                <input key={f} placeholder={label} value={(linkForm as any)[f]}
                  onChange={e => setLinkForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              ))}
              <input type="number" placeholder="Порядок" value={linkForm.order}
                onChange={e => setLinkForm(p => ({ ...p, order: +e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={linkForm.open_in_iframe}
                  onChange={e => setLinkForm(p => ({ ...p, open_in_iframe: e.target.checked }))} />
                Открывать в iframe
              </label>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => createLink(showCreateLink)} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreateLink(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модал редактирования ссылки */}
      {editLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-4">Редактировать ссылку</h3>
            <div className="space-y-3">
              {[["name","Название"],["url","URL"],["icon","Иконка"],["description","Описание"]].map(([f, label]) => (
                <input key={f} placeholder={label} value={(editLink as any)[f] || ""}
                  onChange={e => setEditLink(p => p ? { ...p, [f]: e.target.value } : p)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              ))}
              <input type="number" placeholder="Порядок" value={editLink.order}
                onChange={e => setEditLink(p => p ? { ...p, order: +e.target.value } : p)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editLink.open_in_iframe}
                  onChange={e => setEditLink(p => p ? { ...p, open_in_iframe: e.target.checked } : p)} />
                Открывать в iframe
              </label>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={updateLink} disabled={saving}
                className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button onClick={() => setEditLink(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}