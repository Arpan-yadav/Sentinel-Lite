"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Upload,
  BarChart2,
  GitMerge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingUp,
  Cpu,
} from "lucide-react";

interface DatasetLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetEvaluated?: () => void;
}

interface EvaluationResult {
  dataset_filename: string;
  samples_evaluated: number;
  has_ground_truth: boolean;
  ingested_into_db: boolean;
  events_ingested: number;
  uploaded_dataset_metrics: {
    accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    fpr_pct: number;
    mean_anomaly_score: number;
    true_positives: number;
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
  };
  baseline_cicids2017_metrics: {
    name: string;
    samples: number;
    accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    fpr_pct: number;
  };
  merged_overall_metrics: {
    merged_total_samples: number;
    accuracy_pct: number;
    precision_pct: number;
    recall_pct: number;
    f1_score_pct: number;
    fpr_pct: number;
    delta_accuracy_pct: number;
    delta_f1_pct: number;
  };
  class_distribution: Record<string, number>;
  sample_predictions: Array<{
    id: string;
    timestamp: string;
    source_ip: string;
    dest_ip: string;
    dest_port: number;
    protocol: string;
    ground_truth: string;
    predicted_class: string;
    anomaly_score: number;
    confidence: number;
    is_match: boolean;
  }>;
}

export function DatasetLabModal({ isOpen, onClose, onDatasetEvaluated }: DatasetLabModalProps) {
  const [evaluating, setEvaluating] = useState(false);
  const [mergeWithBaseline, setMergeWithBaseline] = useState(true);
  const [ingestIntoDb, setIngestIntoDb] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeEvaluation(file);
    e.target.value = "";
  };

  const handleLoadSampleDataset = async () => {
    // Generate synthetic UNSW-NB15 / Modern Threat sample CSV in memory
    const headers = "timestamp,source_ip,dest_ip,source_port,dest_port,protocol,event_type,duration,packet_count,failed_attempts,label\n";
    const rows = [
      "2026-11-14T08:00:01Z,192.168.1.50,10.0.0.10,49152,443,TCP,authorized_connection,0.05,12,0,Normal",
      "2026-11-14T08:00:02Z,192.168.1.51,10.0.0.10,49153,80,TCP,authorized_connection,0.04,8,0,Normal",
      "2026-11-14T08:00:03Z,45.138.16.80,10.0.0.25,51200,80,TCP,http_flood,5.12,1420,0,DDoS",
      "2026-11-14T08:00:04Z,45.138.16.80,10.0.0.25,51201,80,TCP,http_flood,4.89,1390,0,DDoS",
      "2026-11-14T08:00:05Z,178.62.204.30,10.0.0.25,48900,443,TCP,sql_injection_attempt,2.15,24,0,Web Attack",
      "2026-11-14T08:00:06Z,194.26.29.150,10.0.0.10,41000,22,TCP,syn_probe,0.01,2,0,PortScan",
      "2026-11-14T08:00:07Z,194.26.29.150,10.0.0.10,41001,80,TCP,syn_probe,0.01,2,0,PortScan",
      "2026-11-14T08:00:08Z,185.220.101.99,10.0.0.5,39000,22,TCP,ssh_login_failure,0.25,8,7,Brute Force",
      "2026-11-14T08:00:09Z,192.168.1.52,10.0.0.10,49154,443,TCP,authorized_connection,0.08,15,0,Normal",
      "2026-11-14T08:00:10Z,192.168.1.53,10.0.0.10,49155,443,TCP,authorized_connection,0.03,6,0,Normal",
    ];
    const csvBlob = new Blob([headers + rows.join("\n")], { type: "text/csv" });
    const file = new File([csvBlob], "unsw_nb15_sample_subset.csv", { type: "text/csv" });
    await executeEvaluation(file);
  };

  const executeEvaluation = async (file: File) => {
    try {
      setEvaluating(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post<EvaluationResult>(
        `/analytics/upload-evaluate?merge_with_baseline=${mergeWithBaseline}&ingest_into_db=${ingestIntoDb}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(res.data);
      onDatasetEvaluated?.();
    } catch {
      setErrorMsg("Failed to parse and evaluate dataset. Verify CSV structure and format.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-(--background-card) border border-(--border) rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border) pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-(--foreground) font-mono">
                Dataset Evaluation & Comparative Model Lab
              </h2>
              <p className="text-xs text-(--foreground-muted) font-mono mt-0.5">
                Upload new security telemetry, cross-validate generalization, and compute merged benchmark performance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--background-muted) transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Controls & Settings */}
        <div className="p-4 rounded-xl bg-(--background-muted)/50 border border-(--border) space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm">
                <Upload className="h-4 w-4" />
                {evaluating ? "Evaluating Dataset..." : "Upload New Log Dataset (CSV)"}
                <input
                  type="file"
                  accept=".csv,.txt,.log"
                  onChange={handleFileUpload}
                  disabled={evaluating}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleDataset}
                disabled={evaluating}
                className="px-3.5 py-2.5 rounded-lg bg-(--background-card) border border-purple-500/40 hover:border-purple-500 text-purple-400 font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Quick test with a sample UNSW-NB15 threat log subset"
              >
                <Sparkles className="h-3.5 w-3.5" />
                ⚡ Load Sample Threat Subset
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-(--foreground-muted)">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeWithBaseline}
                  onChange={(e) => setMergeWithBaseline(e.target.checked)}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span className="text-(--foreground)">Merge with Baseline CICIDS2017</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ingestIntoDb}
                  onChange={(e) => setIngestIntoDb(e.target.checked)}
                  className="accent-purple-500 cursor-pointer"
                />
                <span>Persist into Live DB</span>
              </label>
            </div>
          </div>
        </div>

        {/* Comparative 3-Column Performance Dashboard */}
        {result && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-xs font-bold font-mono text-(--foreground) uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Comparative Model Performance Analysis
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {/* Baseline Column */}
              <div className="p-4 rounded-xl bg-(--background-muted) border border-(--border) space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-(--border)">
                  <span className="font-bold text-(--foreground)">Baseline Benchmark</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                    CICIDS2017
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Evaluated Flows:</span>
                    <span className="font-bold text-(--foreground)">
                      {result.baseline_cicids2017_metrics.samples.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Model Accuracy:</span>
                    <span className="font-bold text-emerald-400">
                      {result.baseline_cicids2017_metrics.accuracy_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Precision (PPV):</span>
                    <span className="font-bold text-blue-400">
                      {result.baseline_cicids2017_metrics.precision_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Recall (Sens.):</span>
                    <span className="font-bold text-teal-400">
                      {result.baseline_cicids2017_metrics.recall_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Balanced F1-Score:</span>
                    <span className="font-bold text-purple-400">
                      {result.baseline_cicids2017_metrics.f1_score_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">False Positive Rate:</span>
                    <span className="font-bold text-slate-300">
                      {result.baseline_cicids2017_metrics.fpr_pct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Uploaded Dataset Column */}
              <div className="p-4 rounded-xl bg-(--background-muted) border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-(--border)">
                  <span className="font-bold text-emerald-400 truncate max-w-[150px]">
                    {result.dataset_filename}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                    New Upload
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Evaluated Flows:</span>
                    <span className="font-bold text-(--foreground)">
                      {result.samples_evaluated.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Model Accuracy:</span>
                    <span className="font-bold text-emerald-400">
                      {result.uploaded_dataset_metrics.accuracy_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Precision (PPV):</span>
                    <span className="font-bold text-blue-400">
                      {result.uploaded_dataset_metrics.precision_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Recall (Sens.):</span>
                    <span className="font-bold text-teal-400">
                      {result.uploaded_dataset_metrics.recall_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Balanced F1-Score:</span>
                    <span className="font-bold text-purple-400">
                      {result.uploaded_dataset_metrics.f1_score_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Mean Anomaly Score:</span>
                    <span className="font-bold text-amber-400">
                      {result.uploaded_dataset_metrics.mean_anomaly_score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Merged Overall Benchmark Column */}
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <GitMerge className="h-3.5 w-3.5 text-purple-400" /> Merged Benchmark
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                    Combined
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Total Flows:</span>
                    <span className="font-bold text-(--foreground)">
                      {result.merged_overall_metrics.merged_total_samples.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Combined Accuracy:</span>
                    <span className="font-bold text-emerald-400">
                      {result.merged_overall_metrics.accuracy_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Combined F1-Score:</span>
                    <span className="font-bold text-purple-400">
                      {result.merged_overall_metrics.f1_score_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Accuracy Drift (Δ):</span>
                    <span
                      className={`font-bold ${
                        result.merged_overall_metrics.delta_accuracy_pct >= 0
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {result.merged_overall_metrics.delta_accuracy_pct >= 0 ? "+" : ""}
                      {result.merged_overall_metrics.delta_accuracy_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">F1-Score Drift (Δ):</span>
                    <span
                      className={`font-bold ${
                        result.merged_overall_metrics.delta_f1_pct >= 0
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {result.merged_overall_metrics.delta_f1_pct >= 0 ? "+" : ""}
                      {result.merged_overall_metrics.delta_f1_pct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--foreground-muted)">Combined FPR:</span>
                    <span className="font-bold text-slate-300">
                      {result.merged_overall_metrics.fpr_pct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inferred Predictions Table */}
            {result.sample_predictions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold font-mono text-(--foreground) flex items-center justify-between">
                  <span>Sample Inferred Telemetry Records ({result.sample_predictions.length} Preview)</span>
                  <span className="text-[10px] text-(--foreground-muted)">
                    Ground Truth vs. XGBoost / Isolation Forest Inferences
                  </span>
                </div>

                <div className="border border-(--border) rounded-xl overflow-x-auto text-xs font-mono">
                  <table className="w-full border-collapse">
                    <thead className="bg-(--background-muted) text-(--foreground-muted) text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 text-left">Vector</th>
                        <th className="p-2.5 text-left">Target Port</th>
                        <th className="p-2.5 text-left">Proto</th>
                        <th className="p-2.5 text-left">Ground Truth</th>
                        <th className="p-2.5 text-left">ML Prediction</th>
                        <th className="p-2.5 text-left">Anomaly</th>
                        <th className="p-2.5 text-left">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border)">
                      {result.sample_predictions.map((p) => (
                        <tr key={p.id} className="hover:bg-(--background-muted)/40 transition-colors">
                          <td className="p-2.5 text-(--foreground) font-mono">{p.source_ip}</td>
                          <td className="p-2.5 text-(--foreground-muted)">{p.dest_port}</td>
                          <td className="p-2.5 text-(--foreground-muted)">{p.protocol}</td>
                          <td className="p-2.5 font-semibold text-(--foreground)">{p.ground_truth}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.predicted_class === "Normal"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {p.predicted_class}
                            </span>
                          </td>
                          <td className="p-2.5 text-amber-400 font-mono">{p.anomaly_score.toFixed(3)}</td>
                          <td className="p-2.5">
                            {p.is_match ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                <CheckCircle2 className="h-3 w-3" /> Match
                              </span>
                            ) : (
                              <span className="text-amber-400 flex items-center gap-1 font-bold">
                                <AlertTriangle className="h-3 w-3" /> Divergence
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-(--border) text-xs font-mono">
          <div className="flex items-center gap-2 text-(--foreground-muted) text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
            Model: XGBoost Classifier + Isolation Forest (Ensemble Generalization Engine)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-(--background-muted) hover:bg-(--background) border border-(--border) text-(--foreground) font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
