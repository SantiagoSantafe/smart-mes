import clsx from "clsx";

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  commercial_order: { label: "Orden Comercial", color: "bg-slate-600 text-slate-200" },
  production_board: { label: "Junta Producción", color: "bg-blue-900 text-blue-200" },
  blueprints_review: { label: "Revisión Planos", color: "bg-indigo-900 text-indigo-200" },
  purchasing: { label: "Compras", color: "bg-yellow-900 text-yellow-200" },
  materials_received: { label: "Materiales OK", color: "bg-emerald-900 text-emerald-200" },
  production: { label: "Producción", color: "bg-orange-900 text-orange-200" },
  quality_check: { label: "Calidad", color: "bg-purple-900 text-purple-200" },
  logistics: { label: "Logística", color: "bg-cyan-900 text-cyan-200" },
  delivered: { label: "Entregado", color: "bg-green-900 text-green-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planificado", color: "bg-slate-700 text-slate-300" },
  in_progress: { label: "En Proceso", color: "bg-blue-900 text-blue-200" },
  done: { label: "Completado", color: "bg-green-900 text-green-200" },
  blocked: { label: "Bloqueado", color: "bg-red-900 text-red-200" },
  draft: { label: "Borrador", color: "bg-slate-700 text-slate-300" },
  sent: { label: "Enviada", color: "bg-blue-900 text-blue-200" },
  confirmed: { label: "Confirmada", color: "bg-indigo-900 text-indigo-200" },
  completed: { label: "Completada", color: "bg-green-900 text-green-200" },
  cancelled: { label: "Cancelada", color: "bg-red-900 text-red-200" },
  pending: { label: "Pendiente", color: "bg-yellow-900 text-yellow-200" },
  ordered: { label: "Ordenado", color: "bg-blue-900 text-blue-200" },
  in_transit: { label: "En Tránsito", color: "bg-cyan-900 text-cyan-200" },
  received: { label: "Recibido", color: "bg-green-900 text-green-200" },
  partial: { label: "Parcial", color: "bg-orange-900 text-orange-200" },
  normal: { label: "Normal", color: "bg-slate-700 text-slate-300" },
  urgent: { label: "Urgente", color: "bg-orange-900 text-orange-200" },
  critico: { label: "Crítico", color: "bg-red-900 text-red-200" },
  ok: { label: "OK", color: "bg-green-900 text-green-200" },
  faltante: { label: "Faltante", color: "bg-yellow-900 text-yellow-200" },
  bajo_minimo: { label: "Bajo Mínimo", color: "bg-orange-900 text-orange-200" },
};

const ALL_CONFIG = { ...STATE_CONFIG, ...STATUS_CONFIG };

export default function StatusBadge({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "xs";
}) {
  const cfg = ALL_CONFIG[status] || { label: status, color: "bg-slate-700 text-slate-300" };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        cfg.color,
        size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs"
      )}
    >
      {cfg.label}
    </span>
  );
}

export { STATE_CONFIG, STATUS_CONFIG };
