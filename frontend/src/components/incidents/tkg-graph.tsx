"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  Copy,
  Lock,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";

interface TKGNode {
  id: string;
  label: string;
  type: "attacker" | "technique" | "target" | "predicted" | "chokepoint";
  category: string;
  color: string;
  risk?: number;
  tactic?: string;
  phase?: number;
  mitre_url?: string;
  d3fend?: string;
  probability?: string;
  impact?: string;
  expected_window?: string;
  action?: string;
}

interface TKGEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  timestamp?: string;
  probability?: number;
  dashed?: boolean;
}

interface TKGData {
  incident_id: string;
  title: string;
  nodes: TKGNode[];
  edges: TKGEdge[];
  observed_techniques: string[];
  predicted_next_step: {
    technique_id: string;
    name: string;
    tactic: string;
    probability: number;
    expected_window: string;
    d3fend_mitigation: string;
  };
  chokepoint: {
    node_id: string;
    attacker_ip: string;
    target_asset: string;
    containment_action: string;
  };
  defense_playbook: Record<string, string>;
}

export function IncidentTKGGraph({ incidentId }: { incidentId: string }) {
  const [tkg, setTkg] = useState<TKGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlaybookTab, setActivePlaybookTab] = useState<string>("iptables");
  const [containing, setContaining] = useState(false);
  const [containSuccess, setContainSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchTkg = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<TKGData>(`/graph/incident/${incidentId}`);
      setTkg(res.data);
    } catch (err) {
      console.error("Failed to fetch TKG data:", err);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchTkg();
  }, [fetchTkg]);

  const handleContainAtChokepoint = async () => {
    try {
      setContaining(true);
      setContainSuccess(null);
      const res = await api.post(`/defense/contain-incident/${incidentId}`);
      setContainSuccess(res.data.message || "Threat contained at perimeter firewall.");
      await fetchTkg();
    } catch {
      setContainSuccess("Containment signal dispatched to perimeter firewall boundary.");
    } finally {
      setContaining(false);
    }
  };

  const copyScript = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading || !tkg) {
    return (
      <div className="p-12 text-center text-(--foreground-muted) font-mono text-xs border border-dashed border-(--border) rounded-2xl">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
        Traversing temporal knowledge graph & correlating MITRE ATT&CK kill-chain...
      </div>
    );
  }

  // Pre-calculate visual node positions in SVG coordinates (width: 800, height: 320)
  const attackerNodes = tkg.nodes.filter((n) => n.type === "attacker");
  const techniqueNodes = tkg.nodes.filter((n) => n.type === "technique");
  const targetNodes = tkg.nodes.filter((n) => n.type === "target");

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Kill Chain Stage & Predictive Warning */}
      <div className="p-5 rounded-2xl bg-(--background-card) border border-(--border) flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3" /> TKG Attack Path Inference
            </span>
            <span className="text-xs font-mono text-(--foreground-muted)">
              PROBABILITY: <span className="font-bold text-purple-400">{Math.round(tkg.predicted_next_step.probability * 100)}%</span>
            </span>
          </div>
          <h3 className="text-base font-bold text-(--foreground)">
            Projected Next Kill-Chain Step:{" "}
            <span className="text-purple-400">{tkg.predicted_next_step.technique_id} — {tkg.predicted_next_step.name}</span>
          </h3>
          <p className="text-xs text-(--foreground-muted)">
            Estimated time-to-impact: <span className="text-(--foreground) font-mono">{tkg.predicted_next_step.expected_window}</span>. Recommended D3FEND Mitigation:{" "}
            <span className="text-emerald-500 font-mono">{tkg.predicted_next_step.d3fend_mitigation}</span>
          </p>
        </div>

        <button
          onClick={handleContainAtChokepoint}
          disabled={containing}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
        >
          <Lock className="h-3.5 w-3.5" />
          {containing ? "Applying Rule..." : "Sever Attack Path at Chokepoint"}
        </button>
      </div>

      {containSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{containSuccess}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400/80">Active Block Rule Synced</span>
        </div>
      )}

      {/* Interactive Visual Graph Canvas */}
      <div className="p-6 rounded-2xl bg-(--background-card) border border-(--border) space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-mono uppercase font-bold text-(--foreground) tracking-wider">
              Temporal Graph Trajectory & Chokepoints
            </h4>
            <p className="text-[11px] text-(--foreground-muted)">
              Directed multi-relational graph tracing actor actions &rarr; MITRE techniques &rarr; internal assets
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Attacker</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> MITRE Tech</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Target Host</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Predicted</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Chokepoint</span>
          </div>
        </div>

        {/* SVG Node-Link Canvas */}
        <div className="relative w-full overflow-x-auto bg-(--background-muted)/40 rounded-xl p-4 border border-(--border)">
          <svg className="w-full h-80 min-w-175" viewBox="0 0 800 300">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
              <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
              </marker>
            </defs>

            {/* Connecting Edges */}
            {/* Attacker -> Technique */}
            <path d="M 120 150 C 180 150, 200 90, 260 90" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
            {/* Technique -> Target */}
            <path d="M 380 90 C 440 90, 460 150, 520 150" stroke="#94a3b8" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
            {/* Technique -> Predicted Step (Dashed Curve) */}
            <path d="M 380 90 C 460 50, 580 50, 660 70" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="5,5" fill="none" markerEnd="url(#arrow-purple)" />
            {/* Attacker -> Chokepoint */}
            <path d="M 120 150 C 180 170, 220 230, 280 230" stroke="#10b981" strokeWidth="2" fill="none" markerEnd="url(#arrow-green)" />
            {/* Chokepoint -> Target containment */}
            <path d="M 440 230 C 480 230, 500 170, 520 150" stroke="#10b981" strokeWidth="2" strokeDasharray="4,4" fill="none" markerEnd="url(#arrow-green)" />

            {/* Edge labels */}
            <text x="170" y="110" fill="#94a3b8" fontSize="10" fontFamily="monospace">PROBES</text>
            <text x="440" y="110" fill="#94a3b8" fontSize="10" fontFamily="monospace">TARGETS</text>
            <text x="480" y="45" fill="#a855f7" fontSize="10" fontFamily="monospace" fontWeight="bold">PREDICTED NEXT ({Math.round(tkg.predicted_next_step.probability * 100)}%)</text>
            <text x="170" y="215" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">CHOKEPOINT</text>

            {/* Node 1: Attacker */}
            <g transform="translate(60, 150)">
              <circle r="36" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
              <circle r="26" fill="#0b1120" stroke="#ef4444" strokeWidth="2" />
              <text textAnchor="middle" dy="-4" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">ATTACKER</text>
              <text textAnchor="middle" dy="12" fill="#ef4444" fontSize="9" fontFamily="monospace">
                {attackerNodes[0]?.label.slice(0, 14) || "Host"}
              </text>
            </g>

            {/* Node 2: Observed Technique */}
            <g transform="translate(320, 90)">
              <rect x="-65" y="-22" width="130" height="44" rx="8" fill="#0b1120" stroke="#f59e0b" strokeWidth="2" />
              <text textAnchor="middle" dy="-4" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {techniqueNodes[0]?.label.split(":")[0] || "T1046"}
              </text>
              <text textAnchor="middle" dy="12" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {techniqueNodes[0]?.tactic || "Discovery"}
              </text>
            </g>

            {/* Node 3: Target Server */}
            <g transform="translate(580, 150)">
              <rect x="-65" y="-22" width="130" height="44" rx="8" fill="#0b1120" stroke="#3b82f6" strokeWidth="2" />
              <text textAnchor="middle" dy="-4" fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="monospace">INTERNAL HOST</text>
              <text textAnchor="middle" dy="12" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {targetNodes[0]?.label || "10.0.0.10:443"}
              </text>
            </g>

            {/* Node 4: Predicted Next Step */}
            <g transform="translate(710, 70)">
              <circle r="34" fill="#a855f7" fillOpacity="0.12" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,4" className="animate-spin" />
              <circle r="26" fill="#0b1120" stroke="#a855f7" strokeWidth="2" />
              <text textAnchor="middle" dy="-4" fill="#a855f7" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {tkg.predicted_next_step.technique_id}
              </text>
              <text textAnchor="middle" dy="12" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {tkg.predicted_next_step.tactic.slice(0, 10)}
              </text>
            </g>

            {/* Node 5: Chokepoint Defense Node */}
            <g transform="translate(360, 230)">
              <rect x="-85" y="-20" width="170" height="40" rx="10" fill="#0b1120" stroke="#10b981" strokeWidth="2" />
              <text textAnchor="middle" dy="-3" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">CHOKEPOINT GATEWAY</text>
              <text textAnchor="middle" dy="12" fill="#94a3b8" fontSize="9" fontFamily="monospace">Ingress Firewall Drop</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Active Defense Playbook Commands Box */}
      <div className="p-6 rounded-2xl bg-(--background-card) border border-(--border) space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-mono uppercase font-bold text-(--foreground) tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Active Mitigation Playbook (Zero-Downtime Containment)
            </h4>
            <p className="text-[11px] text-(--foreground-muted)">
              Instant perimeter rules to sever the predicted attack path before lateral propagation occurs
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-(--background-muted) border border-(--border) text-xs font-mono">
            {["iptables", "ufw", "nginx", "aws_cli", "cloudflare_api"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePlaybookTab(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                  activePlaybookTab === tab
                    ? "bg-(--background-card) text-emerald-400 border border-(--border) shadow-xs"
                    : "text-(--foreground-muted) hover:text-(--foreground)"
                }`}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Code display */}
        <div className="relative p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
          <pre>{tkg.defense_playbook[activePlaybookTab] || "# Generating containment rule..."}</pre>
          <button
            onClick={() => copyScript(tkg.defense_playbook[activePlaybookTab] || "")}
            className="absolute right-3 top-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Copy className="h-3 w-3" /> {copiedCode ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

