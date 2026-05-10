"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, Material, Supplier, PurchaseRequest, ProjectListItem } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { Package, Users, ShoppingBag, Plus } from "lucide-react";
import clsx from "clsx";

type Tab = "materials" | "suppliers" | "requests";

export default function PurchasingPage() {
  const [tab, setTab] = useState<Tab>("materials");

  const { data: materials } = useSWR<Material[]>("materials", api.listMaterials);
  const { data: suppliers } = useSWR<Supplier[]>("suppliers", api.listSuppliers);
  const { data: requests } = useSWR<PurchaseRequest[]>("requests", () => api.listRequests());
  const { data: projects } = useSWR<ProjectListItem[]>("projects", () => api.listProjects());

  const [showModal, setShowModal] = useState<"material" | "supplier" | "request" | "inventory" | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Forms
  const [matForm, setMatForm] = useState({
    code: "",
    description: "",
    unit: "und",
    category: "",
    min_stock: "0",
    is_special_order: false,
  });
  const [suppForm, setSuppForm] = useState({
    name: "",
    contact_info: "",
    tax_id: "",
    payment_terms: "",
    rating: "3",
    notes: "",
  });
  const [reqForm, setReqForm] = useState({
    project_id: "",
    material_id: "",
    quantity_needed: "",
    urgency: "normal",
    notes: "",
  });
  const [invForm, setInvForm] = useState({
    quantity_available: "",
    quantity_reserved: "0",
    warehouse_location: "",
  });

  async function submitMaterial(e: React.FormEvent) {
    e.preventDefault();
    await api.createMaterial({
      ...matForm,
      min_stock: Number(matForm.min_stock),
    });
    mutate("materials");
    setShowModal(null);
    setMatForm({ code: "", description: "", unit: "und", category: "", min_stock: "0", is_special_order: false });
  }

  async function submitSupplier(e: React.FormEvent) {
    e.preventDefault();
    await api.createSupplier({ ...suppForm, rating: Number(suppForm.rating) });
    mutate("suppliers");
    setShowModal(null);
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    await api.createRequest({
      ...reqForm,
      project_id: Number(reqForm.project_id),
      material_id: Number(reqForm.material_id),
      quantity_needed: Number(reqForm.quantity_needed),
    });
    mutate("requests");
    setShowModal(null);
  }

  async function submitInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaterial) return;
    await api.updateInventory(selectedMaterial.id, {
      quantity_available: Number(invForm.quantity_available),
      quantity_reserved: Number(invForm.quantity_reserved),
      warehouse_location: invForm.warehouse_location || undefined,
    });
    mutate("materials");
    setShowModal(null);
    setSelectedMaterial(null);
  }

  function openInventory(m: Material) {
    setSelectedMaterial(m);
    setInvForm({
      quantity_available: String(m.inventory?.quantity_available ?? 0),
      quantity_reserved: String(m.inventory?.quantity_reserved ?? 0),
      warehouse_location: m.inventory?.warehouse_location ?? "",
    });
    setShowModal("inventory");
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "materials", label: "Materiales", icon: Package },
    { key: "suppliers", label: "Proveedores", icon: Users },
    { key: "requests", label: "Solicitudes de Compra", icon: ShoppingBag },
  ];

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Compras y Materiales</h2>
        <div className="flex gap-2">
          {tab === "materials" && (
            <button
              onClick={() => setShowModal("material")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={14} /> Nuevo Material
            </button>
          )}
          {tab === "suppliers" && (
            <button
              onClick={() => setShowModal("supplier")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={14} /> Nuevo Proveedor
            </button>
          )}
          {tab === "requests" && (
            <button
              onClick={() => setShowModal("request")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={14} /> Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === key
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Materials Tab */}
      {tab === "materials" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Descripción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Disponible</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Mínimo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {(materials ?? []).map((m) => {
                const available = m.inventory?.quantity_available ?? 0;
                const reserved = m.inventory?.quantity_reserved ?? 0;
                const net = available - reserved;
                const low = net <= m.min_stock && m.min_stock > 0;
                return (
                  <tr key={m.id} className="hover:bg-slate-750">
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{m.code}</td>
                    <td className="px-4 py-3 text-white">
                      {m.description}
                      {m.is_special_order && (
                        <span className="ml-2 text-xs text-purple-400">[Esp.]</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.category ?? "–"}</td>
                    <td className={clsx("px-4 py-3 text-right font-medium", low ? "text-red-400" : "text-white")}>
                      {net} {m.unit}
                      {low && " ⚠"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                      {m.min_stock} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openInventory(m)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Actualizar Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(materials ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Sin materiales registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Proveedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Condiciones</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {(suppliers ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-750">
                  <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.contact_info ?? "–"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.payment_terms ?? "–"}</td>
                  <td className="px-4 py-3">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={star <= Math.round(s.rating) ? "text-yellow-400" : "text-slate-600"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(suppliers ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500">
                    Sin proveedores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Requests Tab */}
      {tab === "requests" && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Material</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cantidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Urgencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {(requests ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-750">
                  <td className="px-4 py-3 text-white">{r.material.description}</td>
                  <td className="px-4 py-3 text-slate-300">{r.quantity_needed} {r.material.unit}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.urgency} size="xs" /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} size="xs" /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {format(new Date(r.created_at), "dd/MM/yy")}
                  </td>
                </tr>
              ))}
              {(requests ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-500">
                    Sin solicitudes de compra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(null)}
        >
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-md">
            {showModal === "material" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Nuevo Material</h3>
                <form onSubmit={submitMaterial} className="space-y-3">
                  <input required placeholder="Código (ej: ACE-001)" value={matForm.code} onChange={(e) => setMatForm({ ...matForm, code: e.target.value })} className="input-field" />
                  <input required placeholder="Descripción" value={matForm.description} onChange={(e) => setMatForm({ ...matForm, description: e.target.value })} className="input-field" />
                  <input placeholder="Unidad (und, kg, m, m2...)" value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} className="input-field" />
                  <input placeholder="Categoría" value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value })} className="input-field" />
                  <input type="number" step="0.01" placeholder="Stock mínimo" value={matForm.min_stock} onChange={(e) => setMatForm({ ...matForm, min_stock: e.target.value })} className="input-field" />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={matForm.is_special_order} onChange={(e) => setMatForm({ ...matForm, is_special_order: e.target.checked })} className="accent-purple-500" />
                    Pedido especial / sin stock habitual
                  </label>
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}

            {showModal === "supplier" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Nuevo Proveedor</h3>
                <form onSubmit={submitSupplier} className="space-y-3">
                  <input required placeholder="Nombre" value={suppForm.name} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })} className="input-field" />
                  <input placeholder="Contacto (email/teléfono)" value={suppForm.contact_info} onChange={(e) => setSuppForm({ ...suppForm, contact_info: e.target.value })} className="input-field" />
                  <input placeholder="NIT / RUT" value={suppForm.tax_id} onChange={(e) => setSuppForm({ ...suppForm, tax_id: e.target.value })} className="input-field" />
                  <input placeholder="Condiciones de pago" value={suppForm.payment_terms} onChange={(e) => setSuppForm({ ...suppForm, payment_terms: e.target.value })} className="input-field" />
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Rating inicial (1-5)</label>
                    <input type="range" min="1" max="5" step="0.5" value={suppForm.rating} onChange={(e) => setSuppForm({ ...suppForm, rating: e.target.value })} className="w-full" />
                    <span className="text-sm text-white">{suppForm.rating} / 5</span>
                  </div>
                  <textarea placeholder="Notas" value={suppForm.notes} onChange={(e) => setSuppForm({ ...suppForm, notes: e.target.value })} className="input-field h-16 resize-none" />
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}

            {showModal === "request" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Solicitud de Compra</h3>
                <form onSubmit={submitRequest} className="space-y-3">
                  <select required value={reqForm.project_id} onChange={(e) => setReqForm({ ...reqForm, project_id: e.target.value })} className="input-field">
                    <option value="">Proyecto...</option>
                    {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select required value={reqForm.material_id} onChange={(e) => setReqForm({ ...reqForm, material_id: e.target.value })} className="input-field">
                    <option value="">Material...</option>
                    {materials?.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.description}</option>)}
                  </select>
                  <input required type="number" step="0.01" placeholder="Cantidad" value={reqForm.quantity_needed} onChange={(e) => setReqForm({ ...reqForm, quantity_needed: e.target.value })} className="input-field" />
                  <select value={reqForm.urgency} onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })} className="input-field">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgente</option>
                    <option value="critico">Crítico</option>
                  </select>
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}

            {showModal === "inventory" && selectedMaterial && (
              <>
                <h3 className="text-lg font-semibold text-white mb-1">Actualizar Stock</h3>
                <p className="text-sm text-slate-400 mb-4">{selectedMaterial.description} ({selectedMaterial.code})</p>
                <form onSubmit={submitInventory} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Cantidad disponible ({selectedMaterial.unit})</label>
                    <input required type="number" step="0.01" value={invForm.quantity_available} onChange={(e) => setInvForm({ ...invForm, quantity_available: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Cantidad reservada ({selectedMaterial.unit})</label>
                    <input type="number" step="0.01" value={invForm.quantity_reserved} onChange={(e) => setInvForm({ ...invForm, quantity_reserved: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Ubicación en almacén</label>
                    <input placeholder="Estante A-3" value={invForm.warehouse_location} onChange={(e) => setInvForm({ ...invForm, warehouse_location: e.target.value })} className="input-field" />
                  </div>
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}
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

function ModalButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancelar</button>
      <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Guardar</button>
    </div>
  );
}
