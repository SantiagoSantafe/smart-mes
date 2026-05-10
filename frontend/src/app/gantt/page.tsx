"use client";

import useSWR from "swr";
import { api, GanttTask, Bottleneck } from "@/lib/api";
import GanttChart from "@/components/GanttChart";
import { AlertTriangle } from "lucide-react";

export default function GanttPage() {
  const { data: tasks, isLoading } = useSWR<GanttTask[]>("gantt", api.ganttData, {
    refreshInterval: 60000,
  });
  const { data: bottlenecks } = useSWR<Bottleneck[]>("bottlenecks", () =>
    api.bottlenecks()
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Gantt de Producción</h2>
        <p className="text-slate-400 text-sm mt-1">
          Vista de todos los proyectos programados (FCS). Ventana: 30 días.
        </p>
      </div>

      {/* Bottleneck sidebar */}
      {bottlenecks && bottlenecks.length > 0 && (
        <div className="bg-slate-800 border border-orange-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-orange-300 flex items-center gap-2 mb-3">
            <AlertTriangle size={14} /> Áreas con Alta Carga (próx. 14 días)
          </h3>
          <div className="flex flex-wrap gap-4">
            {bottlenecks.map((b) => (
              <div key={b.work_center_id} className="flex items-center gap-3 min-w-[200px]">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{b.work_center_name}</span>
                    <span
                      className={
                        b.utilization_pct >= 100 ? "text-red-400" : "text-orange-400"
                      }
                    >
                      {b.utilization_pct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        b.utilization_pct >= 100 ? "bg-red-500" : "bg-orange-500"
                      }`}
                      style={{ width: `${Math.min(b.utilization_pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gantt */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Cargando programación...</div>
        ) : (
          <GanttChart tasks={tasks ?? []} windowDays={30} />
        )}
      </div>

      {/* Legend */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">
          Leyenda
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-600" /> Barras: paso por
            centro de trabajo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0.5 h-4 bg-blue-400" /> Línea azul = hoy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-600 opacity-50" /> Barra
            opaca = completado
          </span>
        </div>
      </div>
    </div>
  );
}
