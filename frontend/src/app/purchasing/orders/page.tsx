"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, PurchaseOrder, Supplier, Material, ProjectListItem } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

export default function PurchaseOrdersPage() {
  const { data: orders } = useSWR<PurchaseOrder[]>("po-orders", () => api.listOrders2());
  const { data: suppliers } = useSWR<Supplier[]>("suppliers", api.listSuppliers);
  const { data: materials } = useSWR<Material[]>("materials", api.listMaterials);
  const { data: projects } = useSWR<ProjectListItem[]>("projects", () => api.listProjects());

  const [expanded, setExpanded] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: "",
    project_id: "",
    currency: "COP",
    notes: "",
  });
  const [lines, setLines] = useState<
    { material_id: string; quantity: string; unit_price: string; delivery_date_expected: string; is_critical: boolean }[]
  >([]);

  function addLine() {
    setLines([...lines, { material_id: "", quantity: "", unit_price: "", delivery_date_expected: "", is_critical: false }]);
  }

  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }

  async function submitPO(e: React.FormEvent) {
    e.preventDefault();
    await api.createPurchaseOrder({
      supplier_id: Number(poForm.supplier_id),
      project_id: poForm.project_id ? Number(poForm.project_id) : undefined,
      currency: poForm.currency,
      notes: poForm.notes || undefined,
      lines: lines.map((l) => ({
        material_id: Number(l.material_id),
        quantity: Number(l.quantity),
        unit_price: l.unit_price ? Number(l.unit_price) : undefined,
        delivery_date_expected: l.delivery_date_expected ? new Date(l.delivery_date_expected).toISOString() : undefined,
        is_critical: l.is_critical,
      })),
    });
    mutate("po-orders");
    setShowModal(false);
    setPoForm({ supplier_id: "", project_id: "", currency: "COP", notes: "" });
    setLines([]);
  }

  async function receiveLineStatus(poId: number, lineId: number, status: string) {
    await api.receiveLine(poId, lineId, { status });
    mutate("po-orders");
  }

  async function updatePOStatus(poId: number, status: string) {
    await api.updateOrderStatus(poId, status);
    mutate("po-orders");
  }

  const PO_STATUSES = ["draft", "sent", "confirmed", "completed", "cancelled"];
  const LINE_STATUSES = ["pending", "ordered", "in_transit", "received", "partial"];

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Órdenes de Compra</h2>
          <p className="text-slate-400 text-sm mt-1">Gestión de OC con proveedores</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={14} /> Nueva OC
        </button>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {(orders ?? []).length === 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 py-12 text-center text-slate-500">
            Sin órdenes de compra creadas.
          </div>
        )}
        {(orders ?? []).map((po) => {
          const isOpen = expanded === po.id;
          const total = po.total_amount
            ? po.total_amount.toLocaleString("es-CO", { style: "currency", currency: po.currency })
            : "–";
          return (
            <div key={po.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : po.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-750 transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">OC #{po.id} · {po.supplier.name}</p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(po.created_at), "dd/MM/yyyy")}
                    {po.project_id && ` · Proyecto #${po.project_id}`}
                  </p>
                </div>
                <StatusBadge status={po.status} size="xs" />
                <span className="text-sm text-slate-300 ml-2">{total}</span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-700">
                  {/* PO Status control */}
                  <div className="flex items-center gap-2 mt-4 mb-4">
                    <span className="text-xs text-slate-400">Cambiar estado OC:</span>
                    {PO_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updatePOStatus(po.id, s)}
                        disabled={po.status === s}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          po.status === s
                            ? "bg-blue-700 text-white cursor-default"
                            : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Lines */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-left">
                        <th className="pb-2 text-xs text-slate-400">Material</th>
                        <th className="pb-2 text-xs text-slate-400">Cantidad</th>
                        <th className="pb-2 text-xs text-slate-400">P. Unitario</th>
                        <th className="pb-2 text-xs text-slate-400">Entrega esperada</th>
                        <th className="pb-2 text-xs text-slate-400">Crítico</th>
                        <th className="pb-2 text-xs text-slate-400">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {po.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="py-2 text-white">
                            <p>{line.material.description}</p>
                            <p className="text-xs text-slate-400">{line.material.code}</p>
                          </td>
                          <td className="py-2 text-slate-300">{line.quantity} {line.material.unit}</td>
                          <td className="py-2 text-slate-300 text-xs">
                            {line.unit_price ? `${line.currency} ${line.unit_price.toLocaleString()}` : "–"}
                          </td>
                          <td className="py-2 text-slate-400 text-xs">
                            {line.delivery_date_expected
                              ? format(new Date(line.delivery_date_expected), "dd/MM/yy")
                              : "–"}
                          </td>
                          <td className="py-2">
                            {line.is_critical ? (
                              <span className="text-red-400 text-xs font-bold">SÍ</span>
                            ) : (
                              <span className="text-slate-500 text-xs">No</span>
                            )}
                          </td>
                          <td className="py-2">
                            <select
                              value={line.status}
                              onChange={(e) => receiveLineStatus(po.id, line.id, e.target.value)}
                              className="text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                            >
                              {LINE_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New PO Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-2xl my-4">
            <h3 className="text-lg font-semibold text-white mb-4">Nueva Orden de Compra</h3>
            <form onSubmit={submitPO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Proveedor *</label>
                  <select required value={poForm.supplier_id} onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })} className="input-field">
                    <option value="">Seleccionar...</option>
                    {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Proyecto (opcional)</label>
                  <select value={poForm.project_id} onChange={(e) => setPoForm({ ...poForm, project_id: e.target.value })} className="input-field">
                    <option value="">– Sin proyecto –</option>
                    {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Moneda</label>
                <select value={poForm.currency} onChange={(e) => setPoForm({ ...poForm, currency: e.target.value })} className="input-field w-32">
                  <option>COP</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Líneas de la OC</label>
                  <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    + Agregar línea
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2 flex-wrap items-end">
                      <select
                        required
                        value={line.material_id}
                        onChange={(e) => {
                          const nl = [...lines];
                          nl[i].material_id = e.target.value;
                          setLines(nl);
                        }}
                        className="input-field flex-1 min-w-[160px]"
                      >
                        <option value="">Material...</option>
                        {materials?.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.description}</option>)}
                      </select>
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="Cantidad"
                        value={line.quantity}
                        onChange={(e) => {
                          const nl = [...lines];
                          nl[i].quantity = e.target.value;
                          setLines(nl);
                        }}
                        className="input-field w-24"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="P. Unitario"
                        value={line.unit_price}
                        onChange={(e) => {
                          const nl = [...lines];
                          nl[i].unit_price = e.target.value;
                          setLines(nl);
                        }}
                        className="input-field w-28"
                      />
                      <input
                        type="date"
                        value={line.delivery_date_expected}
                        onChange={(e) => {
                          const nl = [...lines];
                          nl[i].delivery_date_expected = e.target.value;
                          setLines(nl);
                        }}
                        className="input-field w-36"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={line.is_critical}
                          onChange={(e) => {
                            const nl = [...lines];
                            nl[i].is_critical = e.target.checked;
                            setLines(nl);
                          }}
                          className="accent-red-500"
                        />
                        Crítico
                      </label>
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300 text-xs transition-colors flex-shrink-0">
                        ✕
                      </button>
                    </div>
                  ))}
                  {lines.length === 0 && (
                    <p className="text-xs text-slate-500 py-2">Sin líneas. Agrega al menos una.</p>
                  )}
                </div>
              </div>

              <textarea
                placeholder="Notas"
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                className="input-field h-16 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={lines.length === 0} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50">
                  Crear OC
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
