"""
Cyber Threat Intelligence (CTI) Service for SentinelLite.
Maps telemetry detections to the MITRE ATT&CK Enterprise Matrix and MITRE D3FEND frameworks.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Official MITRE ATT&CK Enterprise Matrix Knowledge Base
MITRE_ATTACK_TACTICS = {
    "TA0001": {"name": "Initial Access", "description": "Techniques used to gain an initial foothold."},
    "TA0002": {"name": "Execution", "description": "Techniques that result in adversary-controlled code running."},
    "TA0003": {"name": "Persistence", "description": "Techniques used to maintain access across restarts and credentials."},
    "TA0004": {"name": "Privilege Escalation", "description": "Techniques used to gain higher-level permissions."},
    "TA0005": {"name": "Defense Evasion", "description": "Techniques used to avoid detection."},
    "TA0006": {"name": "Credential Access", "description": "Techniques for stealing credentials like passwords and hashes."},
    "TA0007": {"name": "Discovery", "description": "Techniques used to observe the system and internal network."},
    "TA0008": {"name": "Lateral Movement", "description": "Techniques used to enter and control remote systems."},
    "TA0010": {"name": "Exfiltration", "description": "Techniques used to steal data from the network."},
    "TA0040": {"name": "Impact", "description": "Techniques used to disrupt availability or integrity."},
}

MITRE_ATTACK_TECHNIQUES = {
    "T1046": {
        "id": "T1046",
        "name": "Network Service Discovery",
        "tactic": "TA0007",
        "tactic_name": "Discovery",
        "severity": "medium",
        "kill_chain_phase": 1,
        "description": "Adversary probes host IP and port combinations to map active services.",
        "mitre_url": "https://attack.mitre.org/techniques/T1046/",
        "d3fend_mitigation": "D3-NTA: Network Traffic Analysis & Ingress Port Filtering",
        "detection_signatures": ["syn_probe", "port_scan", "nmap", "tcp_sweep"],
    },
    "T1110": {
        "id": "T1110",
        "name": "Brute Force: Password Guessing",
        "tactic": "TA0006",
        "tactic_name": "Credential Access",
        "severity": "high",
        "kill_chain_phase": 2,
        "description": "Adversary attempts systematic password trials against SSH, FTP, or web authentication.",
        "mitre_url": "https://attack.mitre.org/techniques/T1110/",
        "d3fend_mitigation": "D3-AAL: Account Lockout & Rate Limiting (Exponential Backoff)",
        "detection_signatures": ["ssh_login_failure", "ftp_login_failure", "auth_failure", "brute_force"],
    },
    "T1190": {
        "id": "T1190",
        "name": "Exploit Public-Facing Application",
        "tactic": "TA0001",
        "tactic_name": "Initial Access",
        "severity": "critical",
        "kill_chain_phase": 2,
        "description": "Adversary sends malicious payloads (SQL Injection, XSS, Path Traversal) to compromise web services.",
        "mitre_url": "https://attack.mitre.org/techniques/T1190/",
        "d3fend_mitigation": "D3-WAF: Web Application Firewall Input Filtering & Parameter Sanitization",
        "detection_signatures": ["sql_injection", "xss", "directory_traversal", "remote_code_execution", "web_attack"],
    },
    "T1498": {
        "id": "T1498",
        "name": "Network Denial of Service",
        "tactic": "TA0040",
        "tactic_name": "Impact",
        "severity": "critical",
        "kill_chain_phase": 5,
        "description": "Adversary floods the network link or web socket with volumetric traffic to degrade availability.",
        "mitre_url": "https://attack.mitre.org/techniques/T1498/",
        "d3fend_mitigation": "D3-DRR: Dynamic Rate-Limiting, SYN Cookies, & Anycast Scrubbing",
        "detection_signatures": ["http_flood", "syn_flood", "ddos", "packet_burst"],
    },
    "T1059": {
        "id": "T1059",
        "name": "Command and Scripting Interpreter",
        "tactic": "TA0002",
        "tactic_name": "Execution",
        "severity": "high",
        "kill_chain_phase": 3,
        "description": "Adversary executes unauthorized shell commands (bash, powershell, python) post-initial access.",
        "mitre_url": "https://attack.mitre.org/techniques/T1059/",
        "d3fend_mitigation": "D3-EEA: Endpoint Execution Auditing & Restricted Shell Confinement",
        "detection_signatures": ["shell_exec", "spawn_process", "bash_spawn"],
    },
    "T1021": {
        "id": "T1021",
        "name": "Remote Services / Lateral Movement",
        "tactic": "TA0008",
        "tactic_name": "Lateral Movement",
        "severity": "critical",
        "kill_chain_phase": 4,
        "description": "Adversary uses legitimate credentials or vulnerabilities to pivot laterally across internal subnets via SMB, RDP, or SSH.",
        "mitre_url": "https://attack.mitre.org/techniques/T1021/",
        "d3fend_mitigation": "D3-NMS: Network Micro-Segmentation & Kerberos Ticket Lifetime Enforcement",
        "detection_signatures": ["smb_pivot", "lateral_ssh", "rdp_tunnel"],
    },
    "T1048": {
        "id": "T1048",
        "name": "Exfiltration Over Alternative Protocol",
        "tactic": "TA0010",
        "tactic_name": "Exfiltration",
        "severity": "critical",
        "kill_chain_phase": 5,
        "description": "Adversary transfers sensitive internal assets or database dumps to external command-and-control IP.",
        "mitre_url": "https://attack.mitre.org/techniques/T1048/",
        "d3fend_mitigation": "D3-EBP: Egress Boundary Policy & DNS Tunneling Inspection",
        "detection_signatures": ["data_exfil", "heavy_outbound_transfer", "c2_beacon"],
    },
}


class CTIService:
    """Provides threat intelligence lookups and MITRE ATT&CK technique mapping."""

    @staticmethod
    def map_event_to_mitre(event_type: str, port: int = 0) -> Dict[str, Any]:
        """Maps an event type and destination port to the most probable MITRE ATT&CK technique."""
        clean_type = (event_type or "").lower().strip()

        # Check port scan
        if "scan" in clean_type or "syn_probe" in clean_type or "probe" in clean_type:
            return MITRE_ATTACK_TECHNIQUES["T1046"]

        # Check brute force
        if "brute" in clean_type or "patator" in clean_type or "login_fail" in clean_type:
            return MITRE_ATTACK_TECHNIQUES["T1110"]

        # Check web attack / SQLi / XSS
        if "sql" in clean_type or "xss" in clean_type or "web" in clean_type or port in [80, 443, 8080]:
            if "flood" not in clean_type and "ddos" not in clean_type:
                return MITRE_ATTACK_TECHNIQUES["T1190"]

        # Check DDoS
        if "flood" in clean_type or "ddos" in clean_type or "volumetric" in clean_type:
            return MITRE_ATTACK_TECHNIQUES["T1498"]

        # Default fallback
        if port == 22:
            return MITRE_ATTACK_TECHNIQUES["T1110"]
        return MITRE_ATTACK_TECHNIQUES["T1046"]

    @staticmethod
    def get_technique_details(technique_id: str) -> Optional[Dict[str, Any]]:
        return MITRE_ATTACK_TECHNIQUES.get(technique_id.upper())

    @staticmethod
    def get_all_techniques() -> List[Dict[str, Any]]:
        return list(MITRE_ATTACK_TECHNIQUES.values())

