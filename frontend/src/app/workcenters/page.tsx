"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, WorkCenter, ProcessRoute } from "@/lib/api";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function WorkCentersPage() {
  const { data: workcenters } = useSWR<WorkCenter[]>("workcenters", api.listWorkCenters);
  const { data: routes } = useSWR<ProcessRoute[]>("routes", api.listRoutes);

  const [showWCModal, setShowWCModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState<number | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<number | null>(null);

  const [wcForm, setWcForm] = useState({ name: "", description: "", hours_per_day: "8", work_start_hour: "8" });
  const [routeForm, setRouteForm] = useState({ name: "", project_type: "metalmecanica", description: "" });
  const [stepForm, setStepForm] = useState({
    work_center_id: "",
    step_order: "1",
    name: "",
    estimated_hours: "",
    can_parallel: false,
  });

  const PROJECT_TYPES = ["metalmecanica", "carpinteria", "pintura", "ensamble", "mixto"];

  async function submitWC(e: React.FormEvent) {
    e.preventDefault();
    await api.createWorkCenter({
      ...wcForm,
      hours_per_day: Number(wcForm.hours_per_day),
      work_start_hour: Number(wcForm.work_start_hour),
    });
    mutate("workcenters");
    setShowWCModal(false);
    setWcForm({ name: "", description: "", hours_per_day: "8", work_start_hour: "8" });
  }

  async function submitRoute(e: React.FormEvent) {
    e.preventDefault();
    await api.createRoute(routeForm);
    mutate("routes");
    setShowRouteModal(false);
  }

  async function submitStep(e: React.FormEvent, routeId: number) {
    e.preventDefault();
    await api.addRouteStep(routeId, {
      ...stepForm,
      work_center_id: Number(stepForm.work_center_id),
      step_order: Number(stepForm.step_order),
      estimated_hours: Number(stepForm.estimated_hours),
    });
    mutate("routes");
    setShowStepModal(null);
    setStepForm({ work_center_id: "", step_order: "1", name: "", estimated_hours: "", can_parallel: false });
  }

  async function deleteStep(routeId: number, stepId: number) {
    if (!confirm("¿Eliminar este paso?")) return;
    await api.deleteRouteStep(routeId, stepId);
    mutate("routes");
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Work Centers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Centros de Trabajo</h2>
            <p className="text-slate-400 text-sm mt-1">
              Máquinas y áreas que participan en la producción
            </p>
          </div>
          <button
            onClick={() => setShowWCModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={14} /> Nuevo Centro
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(workcenters ?? []).map((wc) => (
            <div key={wc.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{wc.name}</h3>
                  {wc.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{wc.description}</p>
                  )}
                </div>
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                    wc.is_active ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-400">
                <span>{wc.hours_per_day}h / día</span>
                <span>Inicio: {wc.work_start_hour}:00</span>
              </div>
            </div>
          ))}
          {(workcenters ?? []).length === 0 && (
            <div className="col-span-3 bg-slate-800 rounded-xl border border-slate-700 py-10 text-center text-slate-500">
              Sin centros de trabajo. Crea uno para poder programar rutas.
            </div>
          )}
        </div>
      </div>

      {/* Process Routes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Rutas de Proceso</h3>
            <p className="text-slate-400 text-sm mt-1">
              Define la secuencia de pasos por tipo de proyecto
            </p>
          </div>
          <button
            onClick={() => setShowRouteModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
          >
            <Plus size={14} /> Nueva Ruta
          </button>
        </div>

        <div className="space-y-3">
          {(routes ?? []).map((route) => {
            const isOpen = expandedRoute === route.id;
            return (
              <div key={route.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setExpandedRoute(isOpen ? null : route.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-750 transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">{route.name}</p>
                    <p className="text-xs text-slate-400">
                      Tipo: {route.project_type} · {route.steps.length} paso(s)
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      route.is_active
                        ? "bg-emerald-900 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {route.is_active ? "Activa" : "Inactiva"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-700">
                    {/* Steps table */}
                    <table className="w-full text-sm mt-4">
                      <thead>
                        <tr className="border-b border-slate-700 text-left">
                          <th className="pb-2 text-xs text-slate-400">#</th>
                          <th className="pb-2 text-xs text-slate-400">Paso</th>
                          <th className="pb-2 text-xs text-slate-400">Centro</th>
                          <th className="pb-2 text-xs text-slate-400">Horas Est.</th>
                          <th className="pb-2 text-xs text-slate-400">Paralelo</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {route.steps.map((step) => (
                          <tr key={step.id}>
                            <td className="py-2 text-slate-400">{step.step_order}</td>
                            <td className="py-2 text-white">{step.name}</td>
                            <td className="py-2 text-slate-300 text-xs">
                              {step.work_center.name}
                            </td>
                            <td className="py-2 text-slate-300">{step.estimated_hours}h</td>
                            <td className="py-2 text-xs">
                              {step.can_parallel ? (
                                <span className="text-blue-400">Sí</span>
                              ) : (
                                <span className="text-slate-500">No</span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => deleteStep(route.id, step.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {route.steps.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-500 text-xs">
                              Sin pasos definidos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <button
                      onClick={() => {
                        setStepForm({
                          ...stepForm,
                          step_order: String(route.steps.length + 1),
                        });
                        setShowStepModal(route.id);
                      }}
                      className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      + Agregar paso
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {(routes ?? []).length === 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 py-10 text-center text-slate-500">
              Sin rutas de proceso. Crea una para que el FCS pueda programar proyectos.
            </div>
          )}
        </div>
      </div>

      {/* WC Modal */}
      {showWCModal && (
        <Modal onClose={() => setShowWCModal(false)} title="Nuevo Centro de Trabajo">
          <form onSubmit={submitWC} className="space-y-3">
            <input required placeholder="Nombre (ej: CNC-01, Pintura, Ensamble)" value={wcForm.name} onChange={(e) => setWcForm({ ...wcForm, name: e.target.value })} className="input-field" />
            <input placeholder="Descripción" value={wcForm.description} onChange={(e) => setWcForm({ ...wcForm, description: e.target.value })} className="input-field" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Horas por día</label>
                <input type="number" step="0.5" value={wcForm.hours_per_day} onChange={(e) => setWcForm({ ...wcForm, hours_per_day: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Hora inicio (24h)</label>
                <input type="number" min="0" max="23" value={wcForm.work_start_hour} onChange={(e) => setWcForm({ ...wcForm, work_start_hour: e.target.value })} className="input-field" />
              </div>
            </div>
            <ModalButtons onCancel={() => setShowWCModal(false)} />
          </form>
        </Modal>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <Modal onClose={() => setShowRouteModal(false)} title="Nueva Ruta de Proceso">
          <form onSubmit={submitRoute} className="space-y-3">
            <input required placeholder="Nombre de la ruta" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className="input-field" />
            <select value={routeForm.project_type} onChange={(e) => setRouteForm({ ...routeForm, project_type: e.target.value })} className="input-field">
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Descripción" value={routeForm.description} onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })} className="input-field" />
            <ModalButtons onCancel={() => setShowRouteModal(false)} />
          </form>
        </Modal>
      )}

      {/* Step Modal */}
      {showStepModal !== null && (
        <Modal onClose={() => setShowStepModal(null)} title="Agregar Paso a la Ruta">
          <form onSubmit={(e) => submitStep(e, showStepModal)} className="space-y-3">
            <input required placeholder="Nombre del paso (ej: Corte de perfiles)" value={stepForm.name} onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })} className="input-field" />
            <select required value={stepForm.work_center_id} onChange={(e) => setStepForm({ ...stepForm, work_center_id: e.target.value })} className="input-field">
              <option value="">Centro de trabajo...</option>
              {workcenters?.map((wc) => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Orden</label>
                <input type="number" required value={stepForm.step_order} onChange={(e) => setStepForm({ ...stepForm, step_order: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Horas estimadas</label>
                <input type="number" step="0.5" required value={stepForm.estimated_hours} onChange={(e) => setStepForm({ ...stepForm, estimated_hours: e.target.value })} className="input-field" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={stepForm.can_parallel} onChange={(e) => setStepForm({ ...stepForm, can_parallel: e.target.checked })} className="accent-blue-500" />
              Puede ejecutarse en paralelo con el paso anterior
            </label>
            <ModalButtons onCancel={() => setShowStepModal(null)} />
          </form>
        </Modal>
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

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancelar</button>
      <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Guardar</button>
    </div>
  );
}
