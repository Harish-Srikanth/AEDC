import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any
from sqlalchemy.orm import Session

from ..database import SessionLocal, EvidenceRecord, ChainOfCustodyLog
from .hashing import compute_canonical_hash, compute_block_hash
from .ensemble import compute_adaptive_risk_score
from .features import extract_cyber_features
from .random_forest import load_rf_model

_simulation_running = True


def set_simulation_state(running: bool):
    global _simulation_running
    _simulation_running = running


def is_simulation_running() -> bool:
    return _simulation_running


async def simulated_event_generator(interval_seconds: float = 3.0) -> AsyncGenerator[str, None]:
    """
    Streams simulated cybersecurity events via Server-Sent Events (SSE).
    Clearly labelled with [SIMULATED] and is_simulated=True.
    Appends events to the live cryptographic hash chain in real-time.
    """
    rf_model = load_rf_model()
    seq_counter = 10001

    attack_templates = [
        {
            "action": "login_failure", "process": "cmd.exe",
            "cmd": "powershell.exe -nop -enc JABzACAAPQAgAE4AZQB3AC0ATwBiAGoAZQBjAHQA...",
            "port": 445, "dest_ip": "192.0.2.77", "label": "malicious",
            "attack": "Command Execution", "proto": "TCP", "user": "user_005", "dev": "PC-105"
        },
        {
            "action": "login_success", "process": "svchost.exe",
            "cmd": "C:\\Windows\\system32\\svchost.exe -k netsvcs",
            "port": 443, "dest_ip": "10.0.0.1", "label": "normal",
            "attack": "Normal", "proto": "TCP", "user": "user_001", "dev": "PC-101"
        },
        {
            "action": "file_write", "process": "powershell.exe",
            "cmd": "tar -czf C:\\Users\\Public\\sensitive_archive.tar.gz C:\\Finance\\Q4_Payroll\\",
            "port": 8080, "dest_ip": "198.51.100.22", "label": "malicious",
            "attack": "Data Exfiltration", "proto": "TCP", "user": "user_003", "dev": "PC-115"
        },
        {
            "action": "dns_query", "process": "chrome.exe",
            "cmd": "chrome.exe --type=utility",
            "port": 53, "dest_ip": "10.0.0.15", "label": "normal",
            "attack": "Normal", "proto": "UDP", "user": "user_002", "dev": "PC-102"
        },
        {
            "action": "privilege_elevation", "process": "whoami.exe",
            "cmd": "whoami /priv && net group 'Domain Admins' /domain",
            "port": 135, "dest_ip": "10.0.0.7", "label": "malicious",
            "attack": "Privilege Escalation", "proto": "TCP", "user": "user_010", "dev": "PC-110"
        }
    ]

    while True:
        if not _simulation_running:
            await asyncio.sleep(1.0)
            continue

        await asyncio.sleep(interval_seconds)

        db = SessionLocal()
        try:
            # Get latest block hash
            last_rec = db.query(EvidenceRecord).order_by(EvidenceRecord.id.desc()).first()
            prev_hash = last_rec.block_hash if last_rec else ("0" * 64)

            # Pick template
            tpl = random.choice(attack_templates)
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ev_id = f"SIM-{seq_counter}"
            seq_counter += 1

            payload = {
                "event_id": ev_id,
                "timestamp": now_str,
                "user": tpl["user"],
                "device": tpl["dev"],
                "source_ip": "10.0.0.99",
                "auth_action": tpl["action"],
                "auth_method": "NTLM",
                "auth_status": "FAILURE" if tpl["action"] == "login_failure" else "SUCCESS",
                "process_name": tpl["process"],
                "command_line": tpl["cmd"],
                "destination_ip": tpl["dest_ip"],
                "destination_port": tpl["port"],
                "protocol": tpl["proto"],
                "bytes": random.randint(120, 950000),
                "query_domain": "exfil-c2.xyz" if tpl["label"] == "malicious" else "office.com",
                "file_path": "C:\\Users\\Public\\dump.bin" if tpl["label"] == "malicious" else "",
                "file_action": "write",
                "script": tpl["cmd"] if "powershell" in tpl["process"] else "None",
                "usb_device_id": "USB-009" if random.random() < 0.2 else "None",
                "user_risk_level": "High" if tpl["label"] == "malicious" else "Low",
                "asset_criticality": "High" if tpl["label"] == "malicious" else "Medium",
                "ground_truth_label": tpl["label"],
                "attack_type": f"[SIMULATED] {tpl['attack']}" if tpl["label"] == "malicious" else "Normal",
                "incident_id": "SIM-INC-01" if tpl["label"] == "malicious" else None,
                "is_simulated": True,
            }

            canonical_h = compute_canonical_hash(payload)
            block_h = compute_block_hash(prev_hash, canonical_h)
            payload_json = json.dumps(payload, sort_keys=True)

            # Fast score estimation
            p_rf = 0.92 if tpl["label"] == "malicious" else 0.04
            p_gnn = 0.88 if tpl["label"] == "malicious" else 0.05
            score, tier = compute_adaptive_risk_score(
                p_rf=p_rf,
                p_gnn=p_gnn,
                alpha=0.55,
                user_risk="High" if tpl["label"] == "malicious" else "Low",
                asset_criticality="High" if tpl["label"] == "malicious" else "Medium",
                has_indicators=(tpl["label"] == "malicious")
            )

            new_rec = EvidenceRecord(
                evidence_id=ev_id,
                timestamp=now_str,
                user=tpl["user"],
                device=tpl["dev"],
                source_ip="10.0.0.99",
                destination_ip=tpl["dest_ip"],
                destination_port=tpl["port"],
                protocol=tpl["proto"],
                action=tpl["action"],
                process_name=tpl["process"],
                command_line=tpl["cmd"],
                file_path=payload["file_path"],
                query_domain=payload["query_domain"],
                usb_device_id=payload["usb_device_id"],
                raw_payload=payload_json,
                canonical_hash=canonical_h,
                prev_hash=prev_hash,
                block_hash=block_h,
                is_tampered=False,
                original_payload=payload_json,
                original_hash=canonical_h,
                ground_truth_label=tpl["label"],
                attack_type=payload["attack_type"],
                incident_id=payload["incident_id"],
                user_risk_level=payload["user_risk_level"],
                asset_criticality=payload["asset_criticality"],
                rf_prediction=p_rf,
                gnn_prediction=p_gnn,
                combined_score=score,
                risk_level=tier,
                is_simulated=True,
            )

            db.add(new_rec)
            db.commit()

            event_data = new_rec.to_dict()
            yield f"data: {json.dumps(event_data)}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            db.close()
