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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
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
      badgeColor: "bg-[var(--background-muted)] text-[var(--foreground-muted)] border border-[var(--border)]",
    },
    {
      label: "Active Defense & TKG",
      href: "/dashboard/defense",
      icon: Shield,
      badge: "LIVE",
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    },
    { label: "Analytics & Trends", href: "/dashboard/analytics", icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col h-screen select-none transition-colors duration-200 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border)] gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 animate-glow">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-[var(--foreground)] tracking-wide text-sm block">
            SENTINEL<span className="text-emerald-500 dark:text-emerald-400">LITE</span>
          </span>
          <span className="text-[10px] text-[var(--foreground-muted)] tracking-wider uppercase font-mono block">
            AI-SOC v1.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-[var(--foreground-muted)] uppercase font-mono">
          Operations
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
                  ? "bg-[var(--sidebar-active-bg)] border border-[var(--sidebar-active-border)] text-[var(--sidebar-active-text)] font-semibold shadow-xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-[var(--sidebar-active-text)]"
                      : "text-[var(--foreground-muted)]"
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

      {/* System Status Pill */}
      <div className="p-4 border-t border-[var(--border)] mb-4">
        <div className="rounded-xl bg-[var(--background-muted)] border border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono font-medium text-[var(--foreground)]">ML Engine Active</span>
            </div>
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-[11px] text-[var(--foreground-muted)] mt-1.5 font-mono">
            XGBoost + Isolation Forest
          </div>
        </div>
      </div>
    </aside>
  );
}
