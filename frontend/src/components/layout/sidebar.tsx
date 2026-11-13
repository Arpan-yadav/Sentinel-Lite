"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  Shield,
  Building2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { DashboardStats } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchQuickStats = async () => {
      try {
        const res = await api.get<DashboardStats>("/analytics/dashboard-stats");
        if (isMounted) setStats(res.data);
      } catch {
        // Silent catch for initial unauth
      }
    };

    fetchQuickStats();
    const interval = setInterval(fetchQuickStats, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Incidents",
      href: "/dashboard/incidents",
      icon: AlertTriangle,
      badge: stats?.open_incidents ? String(stats.open_incidents) : null,
      badgeColor: "bg-red-500/15 text-red-500 border border-red-500/30",
    },
    {
      label: "Events Telemetry",
      href: "/dashboard/events",
      icon: Activity,
      badge: stats?.total_events ? `${stats.total_events}` : null,
      badgeColor: "bg-(--background-muted) text-(--foreground-muted) border border-(--border)",
    },
    {
      label: "Active Defense & TKG",
      href: "/dashboard/defense",
      icon: Shield,
      badge: "LIVE",
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    },
    { label: "Analytics & Data Studio", href: "/dashboard/analytics", icon: BarChart3 },
    {
      label: "Admin & Clients",
      href: "/dashboard/admin",
      icon: Building2,
      badge: "ADMIN",
      badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
    },
  ];

  return (
    <aside className="w-64 border-r border-(--border) bg-(--sidebar-bg) flex flex-col h-screen select-none transition-colors duration-200 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-(--border) gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 animate-glow">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-(--foreground) tracking-wide text-sm block">
            SENTINEL<span className="text-emerald-500 dark:text-emerald-400">LITE</span>
          </span>
          <span className="text-[10px] text-(--foreground-muted) tracking-wider uppercase font-mono block">
            AI-SOC v1.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-(--foreground-muted) uppercase font-mono">
          Operations & Governance
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-(--sidebar-active-bg) border border-(--sidebar-active-border) text-(--sidebar-active-text) font-semibold shadow-xs"
                  : "text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--sidebar-hover)"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-(--sidebar-active-text)"
                      : "text-(--foreground-muted)"
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold",
                    item.badgeColor
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Current Operator Badge */}
      <div className="px-4 py-2">
        <div className="rounded-lg bg-(--background-muted)/50 border border-(--border) px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            <div className="text-[11px] font-mono truncate max-w-[120px] text-(--foreground)">
              {user?.email || "analyst@sentinellite.io"}
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {user?.role || "ANALYST"}
          </span>
        </div>
      </div>

      {/* System Status Pill */}
      <div className="p-4 border-t border-(--border) mb-4">
        <div className="rounded-xl bg-(--background-muted) border border-(--border) p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-medium text-(--foreground)">ML & AI Active</span>
            </div>
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-[11px] text-(--foreground-muted) mt-1.5 font-mono">
            Gemini 3.5 + XGBoost 99.8%
          </div>
        </div>
      </div>
    </aside>
  );
}
