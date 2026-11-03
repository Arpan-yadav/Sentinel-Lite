"""Generate realistic synthetic security logs with labeled attack patterns for SentinelLite."""

import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


def generate_normal_traffic(count: int = 400, base_time: datetime = None) -> list:
    """Generate benign corporate traffic (HTTP/HTTPS, DNS, SSH from internal subnet)."""
    events = []
    base_time = base_time or datetime.now(timezone.utc) - timedelta(hours=2)
    internal_ips = [f"192.168.1.{i}" for i in range(10, 80)]
    servers = ["10.0.0.5", "10.0.0.10", "10.0.0.25"]

    for i in range(count):
        ts = base_time + timedelta(seconds=i * random.uniform(2, 10))
        src = random.choice(internal_ips)
        dst = random.choice(servers)
        port = random.choice([80, 443, 53, 22])
        proto = "TCP" if port != 53 else "UDP"

        events.append({
            "timestamp": ts.isoformat(),
            "source_ip": src,
            "dest_ip": dst,
            "source_port": random.randint(30000, 60000),
            "dest_port": port,
            "protocol": proto,
            "event_type": "authorized_connection",
            "bytes_sent": random.randint(200, 5000),
            "bytes_received": random.randint(500, 50000),
            "duration": round(random.uniform(0.01, 1.5), 3),
            "label": "Normal",
        })
    return events


def generate_brute_force(count: int = 60, base_time: datetime = None) -> list:
    """Generate repeated failed authentication attempts from a single suspect IP."""
    events = []
    base_time = base_time or datetime.now(timezone.utc) - timedelta(minutes=45)
    attacker_ip = "185.220.101.42"
    target_server = "10.0.0.5"

    for i in range(count):
        ts = base_time + timedelta(seconds=i * random.uniform(0.5, 2.0))
        is_last = (i == count - 1)

        events.append({
            "timestamp": ts.isoformat(),
            "source_ip": attacker_ip,
            "dest_ip": target_server,
            "source_port": random.randint(40000, 55000),
            "dest_port": 22,  # SSH
            "protocol": "TCP",
            "event_type": "ssh_login_failure" if not is_last else "ssh_login_success",
            "bytes_sent": 840,
            "bytes_received": 1200,
            "duration": 0.45,
            "failed_attempts": i + 1,
            "label": "Brute Force",
        })
    return events


def generate_port_scan(count: int = 80, base_time: datetime = None) -> list:
    """Generate sequential TCP port probing against internal server."""
    events = []
    base_time = base_time or datetime.now(timezone.utc) - timedelta(minutes=30)
    scanner_ip = "194.26.29.112"
    target_server = "10.0.0.10"
    ports_to_probe = list(range(20, 100)) + [445, 1433, 3306, 3389, 8080]

    for i in range(min(count, len(ports_to_probe))):
        ts = base_time + timedelta(seconds=i * 0.15)
        port = ports_to_probe[i]

        events.append({
            "timestamp": ts.isoformat(),
            "source_ip": scanner_ip,
            "dest_ip": target_server,
            "source_port": 49152 + (i % 1000),
            "dest_port": port,
            "protocol": "TCP",
            "event_type": "syn_probe",
            "bytes_sent": 64,
            "bytes_received": 0,
            "duration": 0.001,
            "is_port_scan": True,
            "label": "Port Scan",
        })
    return events


def generate_ddos(count: int = 150, base_time: datetime = None) -> list:
    """Generate high-frequency SYN flood / volumetric requests from multiple IPs."""
    events = []
    base_time = base_time or datetime.now(timezone.utc) - timedelta(minutes=10)
    target_server = "10.0.0.25"

    for i in range(count):
        ts = base_time + timedelta(milliseconds=i * 20)
        bot_ip = f"45.138.16.{random.randint(1, 250)}"

        events.append({
            "timestamp": ts.isoformat(),
            "source_ip": bot_ip,
            "dest_ip": target_server,
            "source_port": random.randint(1024, 65535),
            "dest_port": 80,
            "protocol": "TCP",
            "event_type": "http_flood",
            "bytes_sent": 128,
            "bytes_received": 0,
            "duration": 0.005,
            "packet_count": 1200,
            "label": "DDoS",
        })
    return events


def build_demo_dataset(output_path: str = "data/synthetic/demo_security_logs.csv") -> None:
    """Generate and compile a mixed dataset with benign and attack traffic."""
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    all_events = []
    all_events.extend(generate_normal_traffic(500, base_time=now - timedelta(hours=3)))
    all_events.extend(generate_brute_force(45, base_time=now - timedelta(minutes=50)))
    all_events.extend(generate_port_scan(75, base_time=now - timedelta(minutes=35)))
    all_events.extend(generate_ddos(120, base_time=now - timedelta(minutes=15)))

    # Sort chronologically
    all_events.sort(key=lambda x: x["timestamp"])

    keys = [
        "timestamp",
        "source_ip",
        "dest_ip",
        "source_port",
        "dest_port",
        "protocol",
        "event_type",
        "bytes_sent",
        "bytes_received",
        "duration",
        "label",
    ]

    with open(p, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_events)

    print(f"Generated {len(all_events)} security events in {output_path}")


if __name__ == "__main__":
    build_demo_dataset()

