import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function getSeverityColor(severity: string): { bg: string; text: string; border: string } {
  switch (severity.toLowerCase()) {
    case "critical":
      return { bg: "bg-red-950/40", text: "text-red-400", border: "border-red-800" };
    case "high":
      return { bg: "bg-orange-950/40", text: "text-orange-400", border: "border-orange-800" };
    case "medium":
      return { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-800" };
    default:
      return { bg: "bg-emerald-950/40", text: "text-emerald-400", border: "border-emerald-800" };
  }
}

