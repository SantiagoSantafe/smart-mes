"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  api,
  Project,
  MaterialPlan,
  MaterialPlanLine,
  STATE_LABELS,
  STATES_ORDERED,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  CalendarClock,
  RefreshCw,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import Link from "next/link";

const MATERIAL_TYPES = ["acero", "aluminio", "madera", "vidrio", "pintura", "tornilleria", "otro"];

// ─── Phase timeline ────────────────────────────────────────────────────────────
function PhaseBar({ current }: { current: string }) {
  const idx = STATES_ORDERED.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {STATES_ORDERED.map((state, i) => {
        const past = i < idx;
        const active = i === idx;
        return (
          <div key={state} className="flex items-center flex-1 min-w-0">
            <div
              className={`h-1.5 flex-1 ${i === 0 ? "rounded-l-full" : ""} ${i === STATES_ORDERED.length - 1 ? "rounded-r-full" : ""} ${past || active ? "bg-blue-600" : "bg-slate-700"}`}
            />
            <div className="relative flex flex-col items-center flex-shrink-0">
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  active
                    ? "bg-blue-500 border-blue-300"
                    : past
                    ? "bg-blue-700 border-blue-700"
                    : "bg-slate-700 border-slate-600"
                }`}
              />
              <span
                className={`absolute top-4 text-xs whitespace-nowrap ${active ? "text-blue-300 font-semibold" : "text-slate-500"}`}
              >
                {STATE_LABELS[state]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Material plan ─────────────────────────────────────────────────────────────
function MaterialPlanSection({
  projectId,
  plan,
  phase,
}: {
  projectId: number;
  plan: MaterialPlan | null | undefined;
  phase: string;
}) {
  const canEdit = phase === "planos";
  const canReceive = phase === "requisicion" || phase === "produccion";

  const [showForm, setShowForm] = useState(false);
  const [lineForm, setLineForm] = useState({
    material_type: "acero",
    description: "",
    quantity: "",
    unit: "und",
    supplier_name: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function setL(field: string, value: string) {
    setLineForm((f) => ({ ...f, [field]: value }));
  }

  async function ensurePlan() {
    if (!plan) {
      await api.createPlan(projectId);
      mutate(`plan-${projectId}`);
    }
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!plan) await api.createPlan(projectId);
      await api.addPlanLine(projectId, {
        ...lineForm,
        quantity: Number(lineForm.quantity),
      });
      mutate(`plan-${projectId}`);
      setLineForm({ material_type: "acero", description: "", quantity: "", unit: "und", supplier_name: "", notes: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLine(lineId: number) {
    if (!confirm("¿Eliminar esta línea?")) return;
    await api.deletePlanLine(projectId, lineId);
    mutate(`plan-${projectId}`);
  }

  async function toggleReceived(line: MaterialPlanLine) {
    await api.updatePlanLine(projectId, line.id, { is_received: !line.is_received });
    mutate(`plan-${projectId}`);
  }

  const lines = plan?.lines ?? [];
  const received = lines.filter((l) => l.is_received).length;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Plan de Materiales</h3>
          {lines.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {received}/{lines.length} recibidos
            </p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Plus size={12} /> Agregar material
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addLine} className="bg-slate-900 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tipo</label>
              <select
                value={lineForm.material_type}
                onChange={(e) => setL("material_type", e.target.value)}
                className="input-sm w-full"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Proveedor</label>
              <input
                required
                placeholder="Nombre proveedor"
                value={lineForm.supplier_name}
                onChange={(e) => setL("supplier_name", e.target.value)}
                className="input-sm w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Descripción</label>
            <input
              required
              placeholder="Descripción del material"
              value={lineForm.description}
              onChange={(e) => setL("description", e.target.value)}
              className="input-sm w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cantidad</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={lineForm.quantity}
                onChange={(e) => setL("quantity", e.target.value)}
                className="input-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Unidad</label>
              <input
                placeholder="und, kg, m, ..."
                value={lineForm.unit}
                onChange={(e) => setL("unit", e.target.value)}
                className="input-sm w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Lines table */}
      {lines.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          {canEdit
            ? "Sin materiales. Agrega líneas al plan."
            : "No hay plan de materiales para este proyecto."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="pb-2 text-xs text-slate-400 font-medium">Tipo</th>
                <th className="pb-2 text-xs text-slate-400 font-medium">Descripción</th>
                <th className="pb-2 text-xs text-slate-400 font-medium">Cant.</th>
                <th className="pb-2 text-xs text-slate-400 font-medium">Proveedor</th>
                {(canReceive || canEdit) && (
                  <th className="pb-2 text-xs text-slate-400 font-medium text-center">Recibido</th>
                )}
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {lines.map((line) => (
                <tr key={line.id} className={line.is_received ? "opacity-60" : ""}>
                  <td className="py-2.5 text-slate-400 text-xs capitalize">{line.material_type}</td>
                  <td className="py-2.5 text-white">{line.description}</td>
                  <td className="py-2.5 text-slate-300 whitespace-nowrap">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="py-2.5 text-slate-300 text-xs">{line.supplier_name}</td>
                  {canReceive && (
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => toggleReceived(line)}
                        className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${
                          line.is_received
                            ? "bg-green-600 text-white"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-400"
                        }`}
                      >
                        {line.is_received && <CheckCircle2 size={13} />}
                      </button>
                    </td>
                  )}
                  {canEdit && !canReceive && (
                    <td className="py-2.5 text-center">
                      <span className={`text-xs ${line.is_received ? "text-green-400" : "text-slate-600"}`}>
                        {line.is_received ? "✓" : "–"}
                      </span>
                    </td>
                  )}
                  {canEdit && (
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => deleteLine(line.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Progress bar */}
      {lines.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Materiales recibidos</span>
            <span>
              {received}/{lines.length}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                received === lines.length ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${lines.length > 0 ? (received / lines.length) * 100 : 0}%` }}
            />
          </div>
          {received < lines.length && (phase === "requisicion") && (
            <p className="text-xs text-yellow-400 mt-2">
              Todos los materiales deben estar recibidos para avanzar a Producción.
            </p>
          )}
        </div>
      )}

      <style jsx global>{`
        .input-sm {
          padding: 0.375rem 0.625rem;
          background-color: #0f172a;
          border: 1px solid #475569;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.8rem;
          outline: none;
        }
        .input-sm:focus { border-color: #3b82f6; }
        .input-sm option { background-color: #0f172a; }
      `}</style>
    </div>
  );
}

// ─── FCS Slots ─────────────────────────────────────────────────────────────────
function FCSSection({ projectId, slots }: { projectId: number; slots: Project["fcs_slots"] }) {
  const [scheduling, setScheduling] = useState(false);

  async function runFCS() {
    setScheduling(true);
    try {
      await api.scheduleProject(projectId);
      mutate(`project-${projectId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Programación FCS</h3>
        <button
          onClick={runFCS}
          disabled={scheduling}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={scheduling ? "animate-spin" : ""} />
          {scheduling ? "Calculando..." : "Recalcular"}
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Sin programación FCS. Haz clic en Recalcular para generar el calendario.
        </p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center gap-4 py-2.5 border-b border-slate-700 last:border-0"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  slot.status === "done"
                    ? "bg-green-500"
                    : slot.status === "in_progress"
                    ? "bg-blue-500"
                    : "bg-slate-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{slot.step_name}</p>
                <p className="text-xs text-slate-400">{slot.work_center.name}</p>
              </div>
              <div className="text-right text-xs text-slate-400 shrink-0">
                <p>{format(new Date(slot.planned_start), "dd/MM HH:mm")}</p>
                <p>→ {format(new Date(slot.planned_end), "dd/MM HH:mm")}</p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={slot.status} size="xs" />
                {slot.is_manual && (
                  <span className="block text-center text-xs text-yellow-400 mt-0.5">manual</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading } = useSWR<Project>(`project-${id}`, () =>
    api.getProject(projectId)
  );
  const { data: transitions } = useSWR<{ state: string; label: string }[]>(
    `transitions-${id}`,
    () => api.allowedTransitions(projectId)
  );
  const { data: plan } = useSWR<MaterialPlan | null>(`plan-${projectId}`, () =>
    api.getPlan(projectId).catch(() => null)
  );

  const [transitioning, setTransitioning] = useState(false);
  const [reason, setReason] = useState("");

  async function doTransition(target_state: string) {
    setTransitioning(true);
    try {
      await api.transitionProject(projectId, target_state, reason || undefined);
      setReason("");
      mutate(`project-${id}`);
      mutate(`transitions-${id}`);
      mutate("projects");
      mutate("dashboard");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransitioning(false);
    }
  }

  if (isLoading) {
    return <div className="text-slate-400 p-8">Cargando proyecto...</div>;
  }
  if (!project) {
    return <div className="text-red-400 p-8">Proyecto no encontrado.</div>;
  }

  const phase = project.current_state;
  const showMaterials = ["planos", "requisicion", "produccion", "entrega"].includes(phase);
  const showFCS = ["produccion", "entrega"].includes(phase) || (project.fcs_slots ?? []).length > 0;

  return (
    <div className="max-w-5xl space-y-5">
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
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400 flex-wrap">
              <span>{project.client_name}</span>
              <span className="text-slate-600">·</span>
              <span>{project.project_number}</span>
              <span className="text-slate-600">·</span>
              <span className="capitalize">{project.project_type}</span>
            </div>
          </div>
          <StatusBadge status={project.current_state} />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
          {project.start_date && (
            <span>
              Inicio:{" "}
              <span className="text-slate-200">
                {format(new Date(project.start_date), "dd/MM/yyyy")}
              </span>
            </span>
          )}
          {project.approval_date && (
            <span>
              Aprobación:{" "}
              <span className="text-slate-200">
                {format(new Date(project.approval_date), "dd/MM/yyyy")}
              </span>
            </span>
          )}
          {project.fcs_delivery_date && (
            <span className="flex items-center gap-1">
              <CalendarClock size={12} className="text-blue-400" />
              Entrega FCS:{" "}
              <span className="text-blue-300 font-medium">
                {format(new Date(project.fcs_delivery_date), "dd/MM/yyyy")}
              </span>
            </span>
          )}
        </div>

        {/* Phase bar */}
        <div className="mt-6 pb-5">
          <PhaseBar current={project.current_state} />
        </div>
      </div>

      {/* State machine */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h3 className="font-semibold text-white mb-3">Avanzar Fase</h3>

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
                  → {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {project.current_state === "entrega"
              ? "Proyecto en fase de entrega."
              : "Sin transiciones disponibles."}
          </p>
        )}

        {/* History */}
        {(project.state_history ?? []).length > 0 && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
              Historial
            </p>
            <div className="space-y-1">
              {(project.state_history ?? [])
                .slice()
                .reverse()
                .map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-slate-500">
                      {format(new Date(h.changed_at), "dd/MM/yy HH:mm")}
                    </span>
                    <span className="text-slate-600">→</span>
                    <StatusBadge status={h.to_state} size="xs" />
                    {h.reason && <span className="text-slate-500 italic">· {h.reason}</span>}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Material plan */}
      {showMaterials && (
        <MaterialPlanSection projectId={projectId} plan={plan} phase={phase} />
      )}

      {/* FCS schedule */}
      {showFCS && (
        <FCSSection projectId={projectId} slots={project.fcs_slots ?? []} />
      )}
    </div>
  );
}
