"use client";

import useSWR from "swr";
import { api, DashboardStats, ProjectListItem } from "@/lib/api";
import StatusBadge, { STATE_CONFIG } from "@/components/StatusBadge";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Box, FolderOpen, TrendingUp } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-blue-400",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon size={28} className={`${color} opacity-60`} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useSWR<DashboardStats>("dashboard", api.dashboardStats, {
    refreshInterval: 30000,
  });
  const { data: projects } = useSWR<ProjectListItem[]>("projects", () => api.listProjects(), {
    refreshInterval: 30000,
  });

  const active = projects?.filter((p) => p.current_state !== "delivered") ?? [];
  const delayed = projects?.filter(
    (p) =>
      p.fcs_delivery_date &&
      new Date(p.fcs_delivery_date) < new Date() &&
      p.current_state !== "delivered"
  ) ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Junta de Producción</h2>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Proyectos Activos"
          value={active.length}
          icon={FolderOpen}
          color="text-blue-400"
        />
        <StatCard
          label="Atrasados"
          value={delayed.length}
          icon={AlertTriangle}
          color={delayed.length > 0 ? "text-red-400" : "text-slate-400"}
        />
        <StatCard
          label="OC Críticas Pendientes"
          value={stats?.critical_po_pending ?? "–"}
          icon={Box}
          color={
            (stats?.critical_po_pending ?? 0) > 0 ? "text-orange-400" : "text-slate-400"
          }
        />
        <StatCard
          label="Materiales Bajo Mínimo"
          value={stats?.materials_below_min ?? "–"}
          icon={TrendingUp}
          color={
            (stats?.materials_below_min ?? 0) > 0 ? "text-yellow-400" : "text-slate-400"
          }
        />
      </div>

      {/* Bottlenecks */}
      {stats?.bottlenecks && stats.bottlenecks.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-orange-800 p-5">
          <h3 className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} /> Cuellos de Botella — Próximos 14 días
          </h3>
          <div className="space-y-3">
            {stats.bottlenecks.map((b) => (
              <div key={b.work_center_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{b.work_center_name}</span>
                  <span
                    className={
                      b.utilization_pct >= 100 ? "text-red-400" : "text-orange-400"
                    }
                  >
                    {b.utilization_pct}% cargado
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      b.utilization_pct >= 100 ? "bg-red-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${Math.min(b.utilization_pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects overview */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Proyectos Activos</h3>
          <Link
            href="/projects"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-slate-700">
          {active.slice(0, 10).map((p) => {
            const overdue =
              p.fcs_delivery_date &&
              new Date(p.fcs_delivery_date) < new Date() &&
              p.current_state !== "delivered";
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-750 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.customer_name}</p>
                </div>
                <StatusBadge status={p.current_state} size="xs" />
                {p.fcs_delivery_date && (
                  <span className={`text-xs ${overdue ? "text-red-400" : "text-slate-400"}`}>
                    {format(new Date(p.fcs_delivery_date), "dd/MM/yy")}
                  </span>
                )}
              </Link>
            );
          })}
          {active.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">
              No hay proyectos activos.{" "}
              <Link href="/projects" className="text-blue-400 hover:underline">
                Crear uno
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* State funnel */}
      {stats?.projects_by_state && Object.keys(stats.projects_by_state).length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">Distribución por Estado</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATE_CONFIG).map(([state, { label }]) => {
              const count = stats.projects_by_state[state] ?? 0;
              if (count === 0) return null;
              return (
                <div key={state} className="flex items-center gap-2">
                  <StatusBadge status={state} size="xs" />
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
