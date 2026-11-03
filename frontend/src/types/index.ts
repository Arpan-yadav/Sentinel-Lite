export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "investigating" | "resolved" | "closed";
export type UserRole = "admin" | "analyst";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  source_port: number;
  dest_port: number;
  protocol: string;
  event_type: string;
  raw_data?: Record<string, any>;
  asset_id?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  event_id: string;
  alert_type: string;
  confidence: number;
  anomaly_score: number;
  risk_score: number;
  severity: SeverityLevel;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  risk_score: number;
  alert_count: number;
  first_seen?: string;
  last_seen?: string;
  created_at: string;
}

export interface Investigation {
  id: string;
  incident_id: string;
  summary?: string;
  evidence?: {
    evidence_summary?: string[];
    risk_factors?: string[];
    confidence_level?: string;
  };
  assessment?: {
    assessment?: string;
    timeline_analysis?: string;
  };
  uncertainty?: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  incident_id: string;
  action: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface DashboardStats {
  total_events: number;
  total_alerts: number;
  total_incidents: number;
  open_incidents: number;
  critical_alerts: number;
  avg_risk_score: number;
}

export interface AttackTrend {
  date: string;
  event_type?: string;
  count: number;
}

export interface SeverityDistribution {
  severity: string;
  count: number;
}

