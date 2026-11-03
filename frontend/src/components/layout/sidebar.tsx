"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  BarChart3,
  Terminal,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { label: "Events Telemetry", href: "/dashboard/events", icon: Activity },
  { label: "Analytics & Trends", href: "/dashboard/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-screen select-none">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-slate-100 tracking-wide text-sm block">
            SENTINEL<span className="text-emerald-400">LITE</span>
          </span>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono block">
            AI-SOC v1.0
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-emerald-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* System Status Pill */}
      <div className="p-4 border-t border-slate-800">
        <div className="rounded-md bg-slate-900 border border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono text-slate-300">ML Engine Active</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            XGBoost + IsolationForest
          </div>
        </div>
      </div>
    </aside>
  );
}

