"use client";

import { useMemo } from "react";
import { format, differenceInDays, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import type { GanttTask } from "@/lib/api";
import clsx from "clsx";

const WC_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-600",
  "bg-purple-600",
  "bg-cyan-600",
  "bg-rose-600",
  "bg-yellow-600",
  "bg-indigo-600",
];

function wcColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return WC_COLORS[Math.abs(h) % WC_COLORS.length];
}

interface Props {
  tasks: GanttTask[];
  windowDays?: number;
}

export default function GanttChart({ tasks, windowDays = 30 }: Props) {
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, windowDays);

  const days = useMemo(
    () => Array.from({ length: windowDays }, (_, i) => addDays(today, i)),
    [today, windowDays]
  );

  const projectGroups = useMemo(() => {
    const groups: Record<number, { name: string; tasks: GanttTask[] }> = {};
    for (const t of tasks) {
      if (!groups[t.project_id]) {
        groups[t.project_id] = { name: t.project_name, tasks: [] };
      }
      groups[t.project_id].tasks.push(t);
    }
    return Object.entries(groups).map(([id, g]) => ({ id: Number(id), ...g }));
  }, [tasks]);

  function barStyle(task: GanttTask) {
    const start = new Date(task.start);
    const end = new Date(task.end);
    const left = Math.max(0, differenceInDays(start, today));
    const right = Math.min(windowDays, differenceInDays(end, today));
    const width = Math.max(right - left, 0.5);
    return { left: `${(left / windowDays) * 100}%`, width: `${(width / windowDays) * 100}%` };
  }

  const todayLeft = `${(differenceInDays(today, today) / windowDays) * 100}%`;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No hay tareas programadas. Ejecuta el FCS en un proyecto.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header: days */}
        <div className="flex border-b border-slate-700 mb-1">
          <div className="w-56 flex-shrink-0" />
          <div className="flex-1 relative flex">
            {days
              .filter((_, i) => i % 5 === 0)
              .map((d) => {
                const offset = differenceInDays(d, today);
                return (
                  <div
                    key={d.toISOString()}
                    className="absolute text-xs text-slate-500 -translate-x-1/2"
                    style={{ left: `${(offset / windowDays) * 100}%` }}
                  >
                    {format(d, "d MMM", { locale: es })}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-4">
          {projectGroups.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 pl-1">
                {group.name}
              </p>
              {group.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 mb-1">
                  <div className="w-56 flex-shrink-0 text-xs text-slate-300 truncate pr-2 text-right">
                    {task.step_name}
                    <span className="text-slate-500 ml-1">· {task.work_center}</span>
                  </div>
                  <div className="flex-1 relative h-7 bg-slate-800 rounded">
                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-blue-400 opacity-60 z-10"
                      style={{ left: todayLeft }}
                    />
                    {/* Bar */}
                    <div
                      className={clsx(
                        "absolute top-1 bottom-1 rounded text-xs text-white flex items-center px-1.5 overflow-hidden whitespace-nowrap",
                        wcColor(task.work_center),
                        task.status === "done" && "opacity-50"
                      )}
                      style={barStyle(task)}
                      title={`${task.step_name} · ${format(new Date(task.start), "dd/MM")} – ${format(new Date(task.end), "dd/MM")}`}
                    >
                      <span className="truncate text-xs">
                        {format(new Date(task.start), "dd/MM")}–{format(new Date(task.end), "dd/MM")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
