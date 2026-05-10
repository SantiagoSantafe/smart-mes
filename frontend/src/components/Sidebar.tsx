"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  GanttChartSquare,
  ShoppingCart,
  Wrench,
  Package,
} from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/gantt", label: "Gantt / FCS", icon: GanttChartSquare },
  { href: "/purchasing", label: "Compras", icon: ShoppingCart },
  { href: "/purchasing/orders", label: "Órdenes de Compra", icon: Package },
  { href: "/workcenters", label: "Centros de Trabajo", icon: Wrench },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Smart MES</h1>
        <p className="text-xs text-slate-400 mt-0.5">Coordinador de Producción</p>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">v1.0 · Sin IA</p>
      </div>
    </aside>
  );
}
