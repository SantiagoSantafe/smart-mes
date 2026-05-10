"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, Project, BOM, Material } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  CalendarClock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();

  const { data: project, isLoading } = useSWR<Project>(`project-${id}`, () =>
    api.getProject(projectId)
  );
  const { data: transitions } = useSWR<{ state: string; label: string }[]>(
    `transitions-${id}`,
    () => api.allowedTransitions(projectId)
  );
  const { data: bom } = useSWR<BOM>(`bom-${id}`, () =>
    api.getBOM(projectId).catch(() => null as any)
  );
  const { data: materials } = useSWR<Material[]>("materials", api.listMaterials);

  const [transitioning, setTransitioning] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [reason, setReason] = useState("");
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [bomLine, setBomLine] = useState({
    material_id: "",
    quantity_required: "",
    unit: "und",
    is_critical: false,
  });

  async function doTransition(target_state: string) {
    setTransitioning(true);
    try {
      await api.transitionProject(projectId, target_state, reason || undefined);
      setReason("");
      mutate(`project-${id}`);
      mutate(`transitions-${id}`);
      mutate("projects");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioning(false);
    }
  }

  async function runFCS() {
    setScheduling(true);
    try {
      await api.scheduleProject(projectId);
      mutate(`project-${id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScheduling(false);
    }
  }

  async function createBOM() {
    await api.createBOM(projectId);
    mutate(`bom-${id}`);
  }

  async function addBOMLine(e: React.FormEvent) {
    e.preventDefault();
    await api.addBOMLine(projectId, {
      material_id: Number(bomLine.material_id),
      quantity_required: Number(bomLine.quantity_required),
      unit: bomLine.unit,
      is_critical: bomLine.is_critical,
    });
    setBomLine({ material_id: "", quantity_required: "", unit: "und", is_critical: false });
    mutate(`bom-${id}`);
  }

  async function deleteBOMLine(lineId: number) {
    await api.deleteBOMLine(projectId, lineId);
    mutate(`bom-${id}`);
  }

  async function approveBOM() {
    await api.approveBOM(projectId);
    mutate(`bom-${id}`);
  }

  if (isLoading) {
    return <div className="text-slate-400 p-8">Cargando proyecto...</div>;
  }
  if (!project) {
    return <div className="text-red-400 p-8">Proyecto no encontrado.</div>;
  }

  const slots = project.fcs_slots ?? [];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-200 transition-colors">
          Proyectos
        </Link>
        <ChevronRight size={14} />
        <span className="text-white font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {project.order.customer.name} · Tipo: {project.project_type} · Creado:{" "}
              {format(new Date(project.created_at), "dd MMM yyyy", { locale: es })}
            </p>
          </div>
          <StatusBadge status={project.current_state} />
        </div>

        {/* Delivery */}
        {project.fcs_delivery_date && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <CalendarClock size={15} className="text-blue-400" />
            <span className="text-slate-300">
              Entrega FCS estimada:{" "}
              <strong className="text-white">
                {format(new Date(project.fcs_delivery_date), "EEEE d 'de' MMMM yyyy", {
                  locale: es,
                })}
              </strong>
            </span>
          </div>
        )}

        {/* FCS button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runFCS}
            disabled={scheduling}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={scheduling ? "animate-spin" : ""} />
            {scheduling ? "Programando..." : "Recalcular FCS"}
          </button>
        </div>
      </div>

      {/* State machine */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="font-semibold text-white mb-4">Avanzar Estado del Proyecto</h3>

        {/* Timeline */}
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          {[
            "commercial_order",
            "production_board",
            "blueprints_review",
            "purchasing",
            "materials_received",
            "production",
            "quality_check",
            "logistics",
            "delivered",
          ].map((state, i) => {
            const history = project.state_history.map((h) => h.to_state);
            const isCurrentOrPast =
              state === project.current_state || history.includes(state);
            const isCurrent = state === project.current_state;
            return (
              <div key={state} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-4 h-px ${isCurrentOrPast ? "bg-blue-500" : "bg-slate-600"}`}
                  />
                )}
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isCurrent
                      ? "bg-blue-500 ring-2 ring-blue-300"
                      : isCurrentOrPast
                      ? "bg-blue-700"
                      : "bg-slate-600"
                  }`}
                  title={state.replace(/_/g, " ")}
                />
              </div>
            );
          })}
        </div>

        {transitions && transitions.length > 0 ? (
          <div className="space-y-3">
            <input
              placeholder="Motivo del cambio (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full max-w-sm px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 flex-wrap">
              {transitions.map((t) => (
                <button
                  key={t.state}
                  onClick={() => doTransition(t.state)}
                  disabled={transitioning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {t.label} →
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {project.current_state === "delivered"
              ? "Proyecto entregado."
              : "Sin transiciones disponibles."}
          </p>
        )}

        {/* History */}
        {project.state_history.length > 0 && (
          <div className="mt-5 border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
              Historial
            </p>
            <div className="space-y-1">
              {project.state_history.slice().reverse().map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-slate-500">
                    {format(new Date(h.changed_at), "dd/MM/yy HH:mm")}
                  </span>
                  <span className="text-slate-500">→</span>
                  <StatusBadge status={h.to_state} size="xs" />
                  {h.reason && <span className="text-slate-500">· {h.reason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FCS Schedule */}
      {slots.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-semibold text-white mb-4">Programación FCS</h3>
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-4 py-2 border-b border-slate-700 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{slot.step_name}</p>
                  <p className="text-xs text-slate-400">{slot.work_center.name}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{format(new Date(slot.planned_start), "dd/MM HH:mm")}</p>
                  <p>→ {format(new Date(slot.planned_end), "dd/MM HH:mm")}</p>
                </div>
                <StatusBadge status={slot.status} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOM */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">BOM — Lista de Materiales</h3>
          {!bom && (
            <button
              onClick={createBOM}
              className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Crear BOM
            </button>
          )}
          {bom && !bom.is_approved && (
            <button
              onClick={approveBOM}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <CheckCircle size={14} /> Aprobar BOM
            </button>
          )}
          {bom?.is_approved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle size={13} /> BOM Aprobada
            </span>
          )}
        </div>

        {!bom && (
          <p className="text-sm text-slate-500">No hay BOM creada para este proyecto.</p>
        )}

        {bom && (
          <>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="pb-2 text-xs text-slate-400">Material</th>
                  <th className="pb-2 text-xs text-slate-400">Cantidad</th>
                  <th className="pb-2 text-xs text-slate-400">Unidad</th>
                  <th className="pb-2 text-xs text-slate-400">Crítico</th>
                  {!bom.is_approved && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {bom.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-2 text-white">
                      <p className="font-medium">{line.material.description}</p>
                      <p className="text-xs text-slate-400">{line.material.code}</p>
                    </td>
                    <td className="py-2 text-slate-300">{line.quantity_required}</td>
                    <td className="py-2 text-slate-300">{line.unit}</td>
                    <td className="py-2">
                      {line.is_critical ? (
                        <span className="text-red-400 text-xs font-semibold">SÍ</span>
                      ) : (
                        <span className="text-slate-500 text-xs">No</span>
                      )}
                    </td>
                    {!bom.is_approved && (
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteBOMLine(line.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {bom.lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                      Sin líneas. Agrega materiales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!bom.is_approved && (
              <>
                <button
                  onClick={() => setShowBOMForm(!showBOMForm)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors mb-3"
                >
                  {showBOMForm ? "Cancelar" : "+ Agregar línea"}
                </button>
                {showBOMForm && (
                  <form onSubmit={addBOMLine} className="flex gap-2 flex-wrap">
                    <select
                      required
                      value={bomLine.material_id}
                      onChange={(e) => setBomLine({ ...bomLine, material_id: e.target.value })}
                      className="input-sm"
                    >
                      <option value="">Material...</option>
                      {materials?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.description}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="Cantidad"
                      value={bomLine.quantity_required}
                      onChange={(e) =>
                        setBomLine({ ...bomLine, quantity_required: e.target.value })
                      }
                      className="input-sm w-24"
                    />
                    <input
                      placeholder="Unidad"
                      value={bomLine.unit}
                      onChange={(e) => setBomLine({ ...bomLine, unit: e.target.value })}
                      className="input-sm w-20"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={bomLine.is_critical}
                        onChange={(e) =>
                          setBomLine({ ...bomLine, is_critical: e.target.checked })
                        }
                        className="accent-red-500"
                      />
                      Crítico
                    </label>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
                    >
                      Agregar
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .input-sm {
          padding: 0.375rem 0.625rem;
          background-color: #1e293b;
          border: 1px solid #475569;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.8rem;
          outline: none;
        }
        .input-sm:focus {
          border-color: #3b82f6;
        }
        .input-sm option {
          background-color: #1e293b;
        }
      `}</style>
    </div>
  );
}
