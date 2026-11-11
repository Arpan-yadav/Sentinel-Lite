"""
Temporal Knowledge Graph (TKG) and Attack Path Traversal Engine for SentinelLite.
Maps cyber events to temporal graphs, predicts kill-chain trajectories,
and identifies defensive chokepoints.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx

from app.services.cti_service import CTIService, MITRE_ATTACK_TECHNIQUES

logger = logging.getLogger(__name__)

# Kill-Chain transition probabilities based on real APT & CTI behavior
KILL_CHAIN_TRANSITIONS = {
    "T1046": [  # Network Service Discovery -> Credential Access / Exploitation
        {"technique": "T1110", "probability": 0.88, "impact": "High", "time_window": "5-15 mins"},
        {"technique": "T1190", "probability": 0.76, "impact": "Critical", "time_window": "10-30 mins"},
    ],
    "T1110": [  # Brute Force -> Execution / Lateral Movement
        {"technique": "T1059", "probability": 0.82, "impact": "Critical", "time_window": "2-5 mins"},
        {"technique": "T1021", "probability": 0.79, "impact": "High", "time_window": "15-45 mins"},
    ],
    "T1190": [  # Public Exploit -> Execution / Data Exfiltration
        {"technique": "T1059", "probability": 0.91, "impact": "Critical", "time_window": "1-3 mins"},
        {"technique": "T1048", "probability": 0.68, "impact": "Critical", "time_window": "10-20 mins"},
    ],
    "T1498": [  # Denial of Service -> Sustained Outage / Decoy for Lateral Move
        {"technique": "T1048", "probability": 0.45, "impact": "High", "time_window": "Immediate"},
    ],
}


class TKGService:
    """Constructs and queries Temporal Knowledge Graphs for security incidents."""

    @staticmethod
    def build_incident_tkg(incident_data: Dict[str, Any], events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Constructs a Temporal Knowledge Graph from incident telemetry events.

        Returns a JSON-serializable graph containing nodes, edges, active kill-chain phase,
        predicted next attack step, and optimal defensive chokepoint.
        """
        graph = nx.MultiDiGraph()

        incident_id = str(incident_data.get("id", "incident"))
        incident_title = incident_data.get("title", "Security Incident")
        risk_score = float(incident_data.get("risk_score", 50.0))

        # Track unique entities
        observed_ips: set[str] = set()
        observed_targets: set[str] = set()
        observed_techniques: list[str] = []

        nodes_dict: Dict[str, Dict[str, Any]] = {}
        edges_list: List[Dict[str, Any]] = []

        # Sort events chronologically
        sorted_events = sorted(events, key=lambda x: x.get("timestamp") or "")

        for idx, ev in enumerate(sorted_events):
            src_ip = ev.get("source_ip", "Unknown_Source")
            dst_ip = ev.get("dest_ip", "Unknown_Target")
            dst_port = int(ev.get("dest_port") or 80)
            event_type = ev.get("event_type", "security_event")
            ts = ev.get("timestamp") or datetime.now(timezone.utc).isoformat()

            observed_ips.add(src_ip)
            observed_targets.add(dst_ip)

            # Map to MITRE technique
            mitre_info = CTIService.map_event_to_mitre(event_type, dst_port)
            tech_id = mitre_info["id"]
            if tech_id not in observed_techniques:
                observed_techniques.append(tech_id)

            # Node 1: Attacker Source
            src_node_id = f"attacker:{src_ip}"
            if src_node_id not in nodes_dict:
                nodes_dict[src_node_id] = {
                    "id": src_node_id,
                    "label": src_ip,
                    "type": "attacker",
                    "category": "External Threat Vector",
                    "color": "#ef4444",  # Red
                    "risk": risk_score,
                }

            # Node 2: MITRE Technique
            tech_node_id = f"mitre:{tech_id}"
            if tech_node_id not in nodes_dict:
                nodes_dict[tech_node_id] = {
                    "id": tech_node_id,
                    "label": f"{tech_id}: {mitre_info['name']}",
                    "type": "technique",
                    "tactic": mitre_info["tactic_name"],
                    "phase": mitre_info["kill_chain_phase"],
                    "category": "MITRE ATT&CK",
                    "color": "#f59e0b",  # Amber
                    "mitre_url": mitre_info["mitre_url"],
                    "d3fend": mitre_info["d3fend_mitigation"],
                }

            # Node 3: Target Internal Host
            dst_node_id = f"target:{dst_ip}"
            if dst_node_id not in nodes_dict:
                nodes_dict[dst_node_id] = {
                    "id": dst_node_id,
                    "label": f"{dst_ip} (Port {dst_port})",
                    "type": "target",
                    "category": "Protected Internal Asset",
                    "color": "#3b82f6",  # Blue
                }

            # Temporal Edges: Attacker -> Technique -> Target
            edge_id_1 = f"e_{idx}_1"
            edges_list.append({
                "id": edge_id_1,
                "source": src_node_id,
                "target": tech_node_id,
                "relationship": "EXECUTES_TECHNIQUE",
                "timestamp": ts,
                "details": f"Flow payload {event_type}",
            })

            edge_id_2 = f"e_{idx}_2"
            edges_list.append({
                "id": edge_id_2,
                "source": tech_node_id,
                "target": dst_node_id,
                "relationship": "TARGETS_SERVICE",
                "timestamp": ts,
                "port": dst_port,
                "details": f"Destination port {dst_port}/TCP",
            })

        # Predict next attack step based on observed techniques
        latest_technique = observed_techniques[-1] if observed_techniques else "T1046"
        predicted_steps = KILL_CHAIN_TRANSITIONS.get(latest_technique, KILL_CHAIN_TRANSITIONS["T1046"])
        top_predicted = predicted_steps[0]
        next_tech_info = CTIService.get_technique_details(top_predicted["technique"]) or MITRE_ATTACK_TECHNIQUES["T1110"]

        pred_node_id = f"predicted:{next_tech_info['id']}"
        nodes_dict[pred_node_id] = {
            "id": pred_node_id,
            "label": f"PREDICTED: {next_tech_info['id']} - {next_tech_info['name']}",
            "type": "predicted",
            "category": "Projected Attack Vector",
            "probability": f"{int(top_predicted['probability'] * 100)}%",
            "impact": top_predicted["impact"],
            "expected_window": top_predicted["time_window"],
            "color": "#a855f7",  # Purple
        }

        # Connect latest technique to predicted next step
        edges_list.append({
            "id": "e_predicted_trajectory",
            "source": f"mitre:{latest_technique}",
            "target": pred_node_id,
            "relationship": "NEXT_KILL_CHAIN_STEP",
            "probability": top_predicted["probability"],
            "dashed": True,
        })

        # Identify Optimal Chokepoint (Ingress perimeter firewall node)
        primary_attacker_ip = list(observed_ips)[0] if observed_ips else "45.138.16.74"
        primary_target_ip = list(observed_targets)[0] if observed_targets else "10.0.0.1"

        chokepoint_node_id = "chokepoint:perimeter_gateway"
        nodes_dict[chokepoint_node_id] = {
            "id": chokepoint_node_id,
            "label": "DEFENSE CHOKEPOINT: Perimeter Gateway",
            "type": "chokepoint",
            "category": "Active Containment Boundary",
            "color": "#10b981",  # Emerald
            "action": f"Apply Ingress DROP for {primary_attacker_ip}",
        }

        # Edge from attacker to chokepoint
        edges_list.append({
            "id": "e_chokepoint_contain",
            "source": f"attacker:{primary_attacker_ip}",
            "target": chokepoint_node_id,
            "relationship": "CONTAINMENT_CHOKEPOINT",
            "color": "#10b981",
        })

        # Active Defense Playbook Commands
        defense_playbook = TKGService.generate_defense_playbook(
            attacker_ip=primary_attacker_ip,
            target_ip=primary_target_ip,
            technique_id=latest_technique,
        )

        return {
            "incident_id": incident_id,
            "title": incident_title,
            "nodes": list(nodes_dict.values()),
            "edges": edges_list,
            "observed_techniques": observed_techniques,
            "predicted_next_step": {
                "technique_id": next_tech_info["id"],
                "name": next_tech_info["name"],
                "tactic": next_tech_info["tactic_name"],
                "probability": top_predicted["probability"],
                "expected_window": top_predicted["time_window"],
                "d3fend_mitigation": next_tech_info["d3fend_mitigation"],
            },
            "chokepoint": {
                "node_id": chokepoint_node_id,
                "attacker_ip": primary_attacker_ip,
                "target_asset": primary_target_ip,
                "containment_action": f"Isolate external traffic from {primary_attacker_ip}",
            },
            "defense_playbook": defense_playbook,
        }

    @staticmethod
    def generate_defense_playbook(attacker_ip: str, target_ip: str, technique_id: str) -> Dict[str, str]:
        """Generates ready-to-run active defense commands across multiple deployment targets."""
        return {
            "iptables": f"sudo iptables -I INPUT -s {attacker_ip} -j DROP",
            "ufw": f"sudo ufw deny from {attacker_ip} to any",
            "nginx": f"# Add to /etc/nginx/conf.d/blocklist.conf\ndeny {attacker_ip};",
            "aws_cli": (
                f"aws ec2 revoke-security-group-ingress --group-id sg-soc-default "
                f"--protocol tcp --port 0-65535 --cidr {attacker_ip}/32"
            ),
            "cloudflare_api": (
                f"curl -X POST 'https://api.cloudflare.com/client/v4/zones/YOUR_ZONE/firewall/access_rules/rules' "
                f"-H 'Authorization: Bearer $CF_API_KEY' -H 'Content-Type: application/json' "
                f"-d '{{\"mode\":\"block\",\"configuration\":{{\"target\":\"ip\",\"value\":\"{attacker_ip}\"}},\"notes\":\"SentinelLite TKG Auto-Containment\"}}'"
            ),
        }

