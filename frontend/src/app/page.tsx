"use client";

import useSWR from "swr";
import { api, DashboardData, KanbanCard, STATE_LABELS, STATES_ORDERED } from "@/lib/api";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Box, FolderOpen, Package } from "lucide-react";

const STATE_COLORS: Record<string, string> = {
  entrada_informacion: "border-slate-600",
  planos: "border-blue-700",
  requisicion: "border-yellow-700",
  produccion: "border-orange-700",
  entrega: "border-green-700",
};

const STATE_HEADER_COLORS: Record<string, string> = {
  entrada_informacion: "bg-slate-700 text-slate-200",
  planos: "bg-blue-900 text-blue-200",
  requisicion: "bg-yellow-900 text-yellow-200",
  produccion: "bg-orange-900 text-orange-200",
  entrega: "bg-green-900 text-green-200",
};

function KanbanCardItem({ card }: { card: KanbanCard }) {
  const allReceived = card.materials_total > 0 && card.materials_received === card.materials_total;
  const hasOverdue =
    card.fcs_delivery_date && new Date(card.fcs_delivery_date) < new Date();

  return (
    <Link href={`/projects/${card.id}`}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 hover:border-slate-500 transition-colors cursor-pointer space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{card.name}</p>
            <p className="text-xs text-slate-400 truncate">{card.client_name}</p>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{card.project_number}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 capitalize">{card.project_type}</span>
          {card.fcs_delivery_date && (
            <span className={hasOverdue ? "text-red-400 font-semibold" : "text-slate-400"}>
              {format(new Date(card.fcs_delivery_date), "dd/MM")}
              {hasOverdue && " !"}
            </span>
          )}
        </div>

        {card.materials_total > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-slate-700 rounded-full h-1">
              <div
                className={`h-1 rounded-full ${allReceived ? "bg-green-500" : "bg-yellow-500"}`}
                style={{
                  width: `${Math.round((card.materials_received / card.materials_total) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-slate-500">
              {card.materials_received}/{card.materials_total}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useSWR<DashboardData>("dashboard", api.dashboard, {
    refreshInterval: 30000,
  });

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <Link
          href="/projects"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          + Nuevo Proyecto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
          <FolderOpen size={22} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Proyectos Activos</p>
            <p className="text-2xl font-bold text-blue-400">{data?.active_projects ?? "–"}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
          <Package size={22} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Materiales Pendientes</p>
            <p className="text-2xl font-bold text-yellow-400">{data?.materials_pending ?? "–"}</p>
          </div>
        </div>
      </div>

      {/* Bottlenecks */}
      {data?.bottlenecks && data.bottlenecks.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-orange-800 p-4">
          <h3 className="text-xs font-semibold text-orange-300 flex items-center gap-1.5 mb-3">
            <AlertTriangle size={13} /> Cuellos de Botella — Próximos 14 días
          </h3>
          <div className="space-y-2">
            {data.bottlenecks.map((b) => (
              <div key={b.work_center_id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{b.work_center_name}</span>
                  <span className={b.utilization_pct >= 100 ? "text-red-400" : "text-orange-400"}>
                    {b.utilization_pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${b.utilization_pct >= 100 ? "bg-red-500" : "bg-orange-500"}`}
                    style={{ width: `${Math.min(b.utilization_pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-5 gap-3 min-h-[400px]">
          {(data?.kanban ?? []).map((col) => (
            <div
              key={col.state}
              className={`bg-slate-800 rounded-xl border ${STATE_COLORS[col.state] ?? "border-slate-700"} flex flex-col`}
            >
              <div
                className={`px-3 py-2.5 rounded-t-xl text-xs font-semibold flex items-center justify-between ${STATE_HEADER_COLORS[col.state] ?? "bg-slate-700 text-slate-200"}`}
              >
                <span>{col.label}</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded-full text-xs">
                  {col.cards.length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.cards.map((card) => (
                  <KanbanCardItem key={card.id} card={card} />
                ))}
                {col.cards.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-6">Sin proyectos</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
