"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, ProjectListItem, STATE_LABELS, STATES_ORDERED, PROJECT_TYPES } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";

const INIT_FORM = {
  name: "",
  client_name: "",
  project_number: "",
  project_type: "metalmecanica",
  start_date: "",
  approval_date: "",
  notes: "",
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useSWR<ProjectListItem[]>("projects", () =>
    api.listProjects()
  );

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = (projects ?? []).filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_number.toLowerCase().includes(search.toLowerCase());
    const matchState = !stateFilter || p.current_state === stateFilter;
    return matchSearch && matchState;
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.createProject({
        name: form.name,
        client_name: form.client_name,
        project_number: form.project_number,
        project_type: form.project_type,
        start_date: form.start_date || undefined,
        approval_date: form.approval_date || undefined,
        notes: form.notes || undefined,
      });
      mutate("projects");
      mutate("dashboard");
      setShowModal(false);
      setForm(INIT_FORM);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Proyectos</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={15} /> Nuevo Proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cliente, número..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los estados</option>
          {STATES_ORDERED.map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Proyecto
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Cliente
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                N° / Tipo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Entrega FCS
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500">
                  No se encontraron proyectos.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const overdue =
                p.fcs_delivery_date &&
                new Date(p.fcs_delivery_date) < new Date() &&
                p.current_state !== "entrega";
              return (
                <tr key={p.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-300">{p.client_name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <span className="text-slate-300">{p.project_number}</span>
                    <span className="mx-1 text-slate-600">·</span>
                    <span className="capitalize">{p.project_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.current_state} size="xs" />
                  </td>
                  <td className="px-4 py-3">
                    {p.fcs_delivery_date ? (
                      <span className={overdue ? "text-red-400 font-semibold" : "text-slate-300"}>
                        {format(new Date(p.fcs_delivery_date), "dd/MM/yyyy")}
                        {overdue && " ⚠"}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Sin programar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Nuevo Proyecto</h3>
            <form onSubmit={submitProject} className="space-y-3">
              <input
                required
                placeholder="Nombre del proyecto"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="Nombre del cliente"
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="Número de proyecto (ej: PRY-2026-001)"
                value={form.project_number}
                onChange={(e) => set("project_number", e.target.value)}
                className="input-field"
              />
              <select
                value={form.project_type}
                onChange={(e) => set("project_type", e.target.value)}
                className="input-field"
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Fecha de inicio</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => set("start_date", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Fecha de aprobación</label>
                  <input
                    type="date"
                    value={form.approval_date}
                    onChange={(e) => set("approval_date", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <textarea
                placeholder="Notas (opcional)"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="input-field h-20 resize-none"
              />
              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Crear Proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background-color: #1e293b;
          border: 1px solid #475569;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
        }
        .input-field:focus { border-color: #3b82f6; }
        .input-field option { background-color: #1e293b; }
      `}</style>
    </div>
  );
}
