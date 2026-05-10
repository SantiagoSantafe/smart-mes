import clsx from "clsx";

export const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  entrada_informacion: { label: "Entrada Info", color: "bg-slate-600 text-slate-200" },
  planos: { label: "Planos", color: "bg-blue-900 text-blue-200" },
  requisicion: { label: "Requisición", color: "bg-yellow-900 text-yellow-200" },
  produccion: { label: "Producción", color: "bg-orange-900 text-orange-200" },
  entrega: { label: "Entrega", color: "bg-green-900 text-green-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planificado", color: "bg-slate-700 text-slate-300" },
  in_progress: { label: "En Proceso", color: "bg-blue-900 text-blue-200" },
  done: { label: "Completado", color: "bg-green-900 text-green-200" },
  blocked: { label: "Bloqueado", color: "bg-red-900 text-red-200" },
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
