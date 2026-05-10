"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, Customer, CommercialOrder, ProjectListItem } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";

const PROJECT_TYPES = [
  "metalmecanica",
  "carpinteria",
  "pintura",
  "ensamble",
  "mixto",
];

export default function ProjectsPage() {
  const { data: projects, isLoading } = useSWR<ProjectListItem[]>(
    "projects",
    () => api.listProjects()
  );
  const { data: customers } = useSWR<Customer[]>("customers", api.listCustomers);
  const { data: orders } = useSWR<CommercialOrder[]>("orders", api.listOrders);

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showModal, setShowModal] = useState<"customer" | "order" | "project" | null>(null);

  // Forms
  const [custForm, setCustForm] = useState({ name: "", contact_info: "", tax_id: "" });
  const [orderForm, setOrderForm] = useState({
    customer_id: "",
    delivery_requested: "",
    value: "",
    notes: "",
  });
  const [projForm, setProjForm] = useState({
    order_id: "",
    name: "",
    project_type: "metalmecanica",
    notes: "",
  });

  const filtered = (projects ?? []).filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchState = !stateFilter || p.current_state === stateFilter;
    return matchSearch && matchState;
  });

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    await api.createCustomer(custForm);
    mutate("customers");
    setShowModal(null);
    setCustForm({ name: "", contact_info: "", tax_id: "" });
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    await api.createOrder({
      customer_id: Number(orderForm.customer_id),
      delivery_requested: orderForm.delivery_requested || undefined,
      value: orderForm.value ? Number(orderForm.value) : undefined,
      notes: orderForm.notes || undefined,
    });
    mutate("orders");
    setShowModal(null);
  }

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    await api.createProject({
      order_id: Number(projForm.order_id),
      name: projForm.name,
      project_type: projForm.project_type,
      notes: projForm.notes || undefined,
    });
    mutate("projects");
    setShowModal(null);
  }

  const STATES = [
    "commercial_order",
    "production_board",
    "blueprints_review",
    "purchasing",
    "materials_received",
    "production",
    "quality_check",
    "logistics",
    "delivered",
  ];

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Proyectos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal("customer")}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            + Cliente
          </button>
          <button
            onClick={() => setShowModal("order")}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            + Orden Comercial
          </button>
          <button
            onClick={() => setShowModal("project")}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            <Plus size={15} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto o cliente..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los estados</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Proyecto
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Cliente
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Tipo
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
                p.current_state !== "delivered";
              return (
                <tr key={p.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-300">{p.customer_name}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{p.project_type}</td>
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

      {/* Modals */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(null)}
        >
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-md">
            {showModal === "customer" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Nuevo Cliente</h3>
                <form onSubmit={submitCustomer} className="space-y-3">
                  <input
                    required
                    placeholder="Nombre de la empresa"
                    value={custForm.name}
                    onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                    className="input-field"
                  />
                  <input
                    placeholder="Contacto (email / teléfono)"
                    value={custForm.contact_info}
                    onChange={(e) => setCustForm({ ...custForm, contact_info: e.target.value })}
                    className="input-field"
                  />
                  <input
                    placeholder="NIT / RUT"
                    value={custForm.tax_id}
                    onChange={(e) => setCustForm({ ...custForm, tax_id: e.target.value })}
                    className="input-field"
                  />
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}

            {showModal === "order" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Nueva Orden Comercial</h3>
                <form onSubmit={submitOrder} className="space-y-3">
                  <select
                    required
                    value={orderForm.customer_id}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {customers?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    placeholder="Fecha de entrega solicitada"
                    value={orderForm.delivery_requested}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, delivery_requested: e.target.value })
                    }
                    className="input-field"
                  />
                  <input
                    type="number"
                    placeholder="Valor del proyecto"
                    value={orderForm.value}
                    onChange={(e) => setOrderForm({ ...orderForm, value: e.target.value })}
                    className="input-field"
                  />
                  <textarea
                    placeholder="Notas"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="input-field h-20 resize-none"
                  />
                  <ModalButtons onCancel={() => setShowModal(null)} />
                </form>
              </>
            )}

            {showModal === "project" && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Nuevo Proyecto</h3>
                <form onSubmit={submitProject} className="space-y-3">
                  <select
                    required
                    value={projForm.order_id}
                    onChange={(e) => setProjForm({ ...projForm, order_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar orden comercial...</option>
                    {orders?.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.id} · {o.customer.name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Nombre del proyecto"
                    value={projForm.name}
                    onChange={(e) => setProjForm({ ...projForm, name: e.target.value })}
                    className="input-field"
                  />
                  <select
                    value={projForm.project_type}
                    onChange={(e) => setProjForm({ ...projForm, project_type: e.target.value })}
                    className="input-field"
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Notas"
                    value={projForm.notes}
                    onChange={(e) => setProjForm({ ...projForm, notes: e.target.value })}
                    className="input-field h-20 resize-none"
                  />
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
        .input-field:focus {
          border-color: #3b82f6;
        }
        .input-field option {
          background-color: #1e293b;
        }
      `}</style>
    </div>
  );
}

function ModalButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
      >
        Guardar
      </button>
    </div>
  );
}
