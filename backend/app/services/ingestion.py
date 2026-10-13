import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session

from ..config import DATA_DIR, UPLOADS_DIR
from ..database import EvidenceRecord, ChainOfCustodyLog
from .hashing import compute_canonical_hash, compute_block_hash


def find_dataset_files(search_dirs: Optional[List[Path]] = None) -> Dict[str, Path]:
    """Discovers available forensic dataset files across workspace and upload directories."""
    if search_dirs is None:
        search_dirs = [DATA_DIR, UPLOADS_DIR]

    found_files: Dict[str, Path] = {}
    
    # Priority file keys
    expected_keys = {
        "auth": ["auth_logs.csv", "auth.csv", "auth_logs.json"],
        "process": ["process_logs.csv", "process.csv", "process_logs.json"],
        "network": ["network_logs.csv", "network.csv", "network_logs.json"],
        "dns": ["dns_logs.csv", "dns.csv", "dns_logs.json"],
        "file": ["file_logs.csv", "file.csv", "file_logs.json"],
        "powershell": ["powershell_logs.csv", "powershell.csv", "powershell_logs.json"],
        "usb": ["usb_logs.csv", "usb.csv", "usb_logs.json"],
        "devices": ["devices.csv", "device.csv", "devices.json"],
        "users": ["users (1).csv", "users.csv", "user.csv", "users.json"],
        "ground_truth": ["redteam_ground_truth.csv", "ground_truth.csv", "ground_truth.json"]
    }

    for directory in search_dirs:
        if not directory.exists():
            continue
        for file_path in directory.glob("*.*"):
            fname_lower = file_path.name.lower()
            for key, patterns in expected_keys.items():
                if key not in found_files:
                    for pattern in patterns:
                        if fname_lower == pattern.lower():
                            found_files[key] = file_path
                            break

    return found_files


def inspect_all_datasets() -> List[Dict[str, Any]]:
    """Inspects schemas and row counts of discovered files."""
    files_map = find_dataset_files()
    inspections = []

    for key, path in files_map.items():
        try:
            stat = path.stat()
            if path.suffix.lower() == ".csv":
                df_head = pd.read_csv(path, nrows=5)
                row_count = sum(1 for _ in open(path, "r", encoding="utf-8", errors="ignore")) - 1
                columns = df_head.columns.tolist()
            else:
                row_count = 0
                columns = []

            inspections.append({
                "filename": path.name,
                "file_type": key,
                "size_bytes": stat.st_size,
                "row_count": max(0, row_count),
                "columns": columns,
                "status": "ready"
            })
        except Exception as e:
            inspections.append({
                "filename": path.name,
                "file_type": key,
                "size_bytes": 0,
                "row_count": 0,
                "columns": [],
                "status": f"error: {str(e)}"
            })

    return inspections


def load_and_correlate_data(max_records: Optional[int] = None) -> pd.DataFrame:
    """
    Loads and correlates the 7 forensic log files and auxiliary registries
    (devices.csv, users.csv, redteam_ground_truth.csv) into a unified DataFrame.
    """
    files_map = find_dataset_files()
    if "auth" not in files_map:
        raise FileNotFoundError("Missing primary auth_logs dataset.")

    # 1. Load primary logs
    auth_df = pd.read_csv(files_map["auth"], nrows=max_records)
    proc_df = pd.read_csv(files_map["process"], nrows=max_records) if "process" in files_map else pd.DataFrame()
    net_df = pd.read_csv(files_map["network"], nrows=max_records) if "network" in files_map else pd.DataFrame()
    dns_df = pd.read_csv(files_map["dns"], nrows=max_records) if "dns" in files_map else pd.DataFrame()
    file_df = pd.read_csv(files_map["file"], nrows=max_records) if "file" in files_map else pd.DataFrame()
    ps_df = pd.read_csv(files_map["powershell"], nrows=max_records) if "powershell" in files_map else pd.DataFrame()
    usb_df = pd.read_csv(files_map["usb"], nrows=max_records) if "usb" in files_map else pd.DataFrame()

    # Base DataFrame
    merged = auth_df.copy()
    if "action" in merged.columns:
        merged.rename(columns={"action": "auth_action"}, inplace=True)

    # Process logs join
    if not proc_df.empty:
        proc_cols = [c for c in proc_df.columns if c not in ["timestamp", "user", "device", "label", "attack_type", "incident_id"]]
        merged = pd.merge(merged, proc_df[proc_cols], on="event_id", how="left")

    # Network logs join
    if not net_df.empty:
        net_cols = ["event_id", "destination_ip", "destination_port", "protocol", "bytes"]
        cols_present = [c for c in net_cols if c in net_df.columns]
        merged = pd.merge(merged, net_df[cols_present], on="event_id", how="left")

    # DNS logs join
    if not dns_df.empty:
        dns_cols = ["event_id", "query_domain", "query_type", "response_code"]
        cols_present = [c for c in dns_cols if c in dns_df.columns]
        merged = pd.merge(merged, dns_df[cols_present], on="event_id", how="left")

    # File logs join
    if not file_df.empty:
        file_cols = ["event_id", "file_path", "action", "file_size_bytes"]
        cols_present = [c for c in file_cols if c in file_df.columns]
        file_subset = file_df[cols_present].rename(columns={"action": "file_action"})
        merged = pd.merge(merged, file_subset, on="event_id", how="left")

    # PowerShell logs join
    if not ps_df.empty:
        ps_cols = ["event_id", "script", "execution_policy"]
        cols_present = [c for c in ps_cols if c in ps_df.columns]
        merged = pd.merge(merged, ps_df[cols_present], on="event_id", how="left")

    # USB logs join
    if not usb_df.empty:
        usb_cols = ["event_id", "usb_device_id", "action"]
        cols_present = [c for c in usb_cols if c in usb_df.columns]
        usb_subset = usb_df[cols_present].rename(columns={"action": "usb_action"})
        merged = pd.merge(merged, usb_subset, on="event_id", how="left")

    # 2. Enrich with Devices and Users metadata
    if "devices" in files_map:
        dev_df = pd.read_csv(files_map["devices"])
        if "device_id" in dev_df.columns:
            dev_map = dev_df.set_index("device_id")["asset_criticality"].to_dict()
            merged["asset_criticality"] = merged["device"].map(dev_map).fillna("Low")
    else:
        merged["asset_criticality"] = "Low"

    if "users" in files_map:
        usr_df = pd.read_csv(files_map["users"])
        if "user_id" in usr_df.columns:
            usr_map = usr_df.set_index("user_id")["risk_level"].to_dict()
            merged["user_risk_level"] = merged["user"].map(usr_map).fillna("Low")
    else:
        merged["user_risk_level"] = "Low"

    # Fill NaNs consistently
    merged["incident_id"] = merged["incident_id"].fillna("")
    merged["destination_port"] = pd.to_numeric(merged["destination_port"], errors="coerce").fillna(0).astype(int)
    merged["bytes"] = pd.to_numeric(merged["bytes"], errors="coerce").fillna(0).astype(int)
    merged["file_size_bytes"] = pd.to_numeric(merged.get("file_size_bytes", 0), errors="coerce").fillna(0).astype(int)
    merged["command_line"] = merged.get("command_line", "normal_activity").fillna("normal_activity")
    merged["script"] = merged.get("script", "None").fillna("None")
    merged["query_domain"] = merged.get("query_domain", "none.local").fillna("none.local")
    merged["process_name"] = merged.get("process_name", "unknown.exe").fillna("unknown.exe")
    merged["file_path"] = merged.get("file_path", "").fillna("")
    merged["usb_device_id"] = merged.get("usb_device_id", "None").fillna("None")

    return merged


def execute_ingestion_pipeline(
    db: Session,
    max_records: Optional[int] = None,
    custodian: str = "Forensic Examiner",
    reset_existing: bool = True
) -> Dict[str, Any]:
    """
    Executes the ingestion pipeline:
    - Correlates telemetry
    - Builds cryptographic hash chain
    - Inserts into persistent database
    - Generates Chain of Custody ledger entries
    """
    start_time = time.time()

    if reset_existing:
        db.query(ChainOfCustodyLog).delete()
        db.query(EvidenceRecord).delete()
        db.commit()

    df = load_and_correlate_data(max_records=max_records)
    total_rows = len(df)
    
    records_to_insert = []
    custody_logs_to_insert = []
    prev_hash = "0" * 64
    genesis_hash = prev_hash
    current_time_str = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")

    for idx, row in df.iterrows():
        # Build raw canonical payload dictionary
        payload = {
            "event_id": str(row["event_id"]),
            "timestamp": str(row["timestamp"]),
            "user": str(row.get("user", "")),
            "device": str(row.get("device", "")),
            "source_ip": str(row.get("source_ip", "")),
            "auth_action": str(row.get("auth_action", "")),
            "auth_method": str(row.get("authentication_method", "")),
            "auth_status": str(row.get("status", "")),
            "process_name": str(row.get("process_name", "")),
            "command_line": str(row.get("command_line", "")),
            "destination_ip": str(row.get("destination_ip", "")),
            "destination_port": int(row.get("destination_port", 0)),
            "protocol": str(row.get("protocol", "")),
            "bytes": int(row.get("bytes", 0)),
            "query_domain": str(row.get("query_domain", "")),
            "file_path": str(row.get("file_path", "")),
            "file_action": str(row.get("file_action", "")),
            "script": str(row.get("script", "")),
            "usb_device_id": str(row.get("usb_device_id", "")),
            "user_risk_level": str(row.get("user_risk_level", "Low")),
            "asset_criticality": str(row.get("asset_criticality", "Low")),
            "ground_truth_label": str(row.get("label", "normal")),
            "attack_type": str(row.get("attack_type", "Normal")),
            "incident_id": str(row.get("incident_id", "")),
        }

        canonical_h = compute_canonical_hash(payload)
        block_h = compute_block_hash(prev_hash, canonical_h)

        if idx == 0:
            genesis_hash = block_h

        payload_json = json.dumps(payload, sort_keys=True)

        rec = EvidenceRecord(
            evidence_id=str(row["event_id"]),
            timestamp=str(row["timestamp"]),
            user=str(row.get("user", "")),
            device=str(row.get("device", "")),
            source_ip=str(row.get("source_ip", "")),
            destination_ip=str(row.get("destination_ip", "")),
            destination_port=int(row.get("destination_port", 0)),
            protocol=str(row.get("protocol", "")),
            action=str(row.get("auth_action", "")),
            process_name=str(row.get("process_name", "")),
            command_line=str(row.get("command_line", "")),
            file_path=str(row.get("file_path", "")),
            query_domain=str(row.get("query_domain", "")),
            usb_device_id=str(row.get("usb_device_id", "")),
            raw_payload=payload_json,
            canonical_hash=canonical_h,
            prev_hash=prev_hash,
            block_hash=block_h,
            is_tampered=False,
            original_payload=payload_json,
            original_hash=canonical_h,
            ground_truth_label=str(row.get("label", "normal")),
            attack_type=str(row.get("attack_type", "Normal")),
            incident_id=str(row.get("incident_id", "")) if row.get("incident_id") else None,
            user_risk_level=str(row.get("user_risk_level", "Low")),
            asset_criticality=str(row.get("asset_criticality", "Low")),
            rf_prediction=None,
            gnn_prediction=None,
            combined_score=None,
            risk_level=None,
            is_simulated=False,
        )
        records_to_insert.append(rec)

        # Batch chain of custody logs for key milestone records (first 100 and every 500th)
        if idx < 100 or idx % 500 == 0:
            custody_logs_to_insert.append(ChainOfCustodyLog(
                evidence_id=str(row["event_id"]),
                timestamp=current_time_str,
                custodian=custodian,
                action="INGESTION_AND_HASH_SEALED",
                hash_state=block_h,
                details=f"Canonical hash {canonical_h[:16]}... chained with prev {prev_hash[:16]}..."
            ))

        prev_hash = block_h

    # Fast bulk insertion
    db.bulk_save_objects(records_to_insert)
    db.bulk_save_objects(custody_logs_to_insert)
    db.commit()

    duration = time.time() - start_time
    malicious_count = int((df["label"] == "malicious").sum())
    normal_count = total_rows - malicious_count

    return {
        "total_ingested": total_rows,
        "total_malicious": malicious_count,
        "total_normal": normal_count,
        "root_hash": prev_hash,
        "genesis_hash": genesis_hash,
        "duration_seconds": round(duration, 2),
        "message": f"Successfully ingested {total_rows} correlated evidence records into cryptographic hash chain."
    }
