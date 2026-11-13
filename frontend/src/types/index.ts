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

export interface Client {
  id: string;
  name: string;
  industry: string;
  tier: string;
  status: string;
  network_cidr: string;
  contact_email: string;
  health_score: number;
  active_incidents: number;
  is_active: boolean;
  created_at: string;
}

export interface AnalystUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AiStatus {
  gemini_api_configured: boolean;
  key_prefix: string;
  status: "connected" | "fallback" | "unconfigured";
  model: string;
  sdk?: string;
  latency_ms: number;
  message: string;
}

export interface TelemetrySample {
  id: string;
  timestamp: string;
  time_minute: string;
  attack_type: string;
  protocol: string;
  source_ip: string;
  dest_ip: string;
  dest_port: number;
  flow_duration_ms: number;
  fwd_packets: number;
  packet_length_mean: number;
  packet_length_std: number;
  anomaly_score: number;
  confidence: number;
  severity: SeverityLevel;
  risk_score: number;
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
  raw_data?: Record<string, unknown>;
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
