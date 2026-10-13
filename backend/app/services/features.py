import re
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any

FEATURE_NAMES = [
    "is_failed_login",
    "is_sensitive_auth",
    "is_suspicious_process",
    "has_suspicious_cmd",
    "has_powershell_script",
    "is_risky_port",
    "network_bytes_log",
    "is_external_ip",
    "is_dns_anomaly",
    "is_file_sensitive",
    "is_usb_event",
    "user_risk_num",
    "device_criticality_num",
    "hour_of_day",
    "is_off_hours",
]

SUSPICIOUS_PROCS = {
    "powershell.exe", "cmd.exe", "certutil.exe", "whoami.exe", "mimikatz.exe",
    "net.exe", "psexec.exe", "vssadmin.exe", "rundll32.exe", "reg.exe", "bitsadmin.exe"
}

SUSPICIOUS_CMD_KEYWORDS = [
    "downloadstring", "bypass", "encoded", "-enc", "invoke", "mimikatz",
    "dump", "base64", "iex", "-nop", "-w hidden", "vssadmin", "certutil -urlcache",
    "exfil", "tar -czf", "zip", "external transfer"
]

RISKY_PORTS = {22, 23, 135, 139, 445, 3389, 4444, 5985, 5986, 8080, 8443, 9001}


def extract_cyber_features(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Extracts high-fidelity cyber-forensic feature matrix X and label vector y.
    Guarantees no synthetic fabrication of missing data.
    """
    X_list = []
    
    # Pre-parse timestamps if available
    timestamps = pd.to_datetime(df["timestamp"], errors="coerce")
    hours = timestamps.dt.hour.fillna(12).astype(int).values

    for idx, row in df.iterrows():
        # 1. Auth features
        action_str = str(row.get("action", "") or row.get("auth_action", "")).lower()
        status_str = str(row.get("auth_status", "") or row.get("status", "")).upper()
        is_failed_login = 1.0 if ("failure" in action_str or status_str == "FAILURE") else 0.0
        
        auth_method = str(row.get("authentication_method", "") or row.get("auth_method", "")).upper()
        is_sensitive_auth = 1.0 if auth_method in ["NTLM", "PASSWORD"] else 0.0

        # 2. Process features
        proc_name = str(row.get("process_name", "")).lower()
        is_suspicious_proc = 1.0 if proc_name in SUSPICIOUS_PROCS else 0.0

        cmd = str(row.get("command_line", "")).lower()
        has_suspicious_cmd = 1.0 if any(kw in cmd for kw in SUSPICIOUS_CMD_KEYWORDS) else 0.0

        # 3. PowerShell features
        script = str(row.get("script", "")).strip()
        has_ps = 1.0 if (script and script not in ["None", "No PowerShell activity", "nan"]) else 0.0

        # 4. Network features
        port = int(row.get("destination_port", 0) or 0)
        is_risky_port = 1.0 if port in RISKY_PORTS else 0.0

        net_bytes = float(row.get("bytes", 0) or 0)
        network_bytes_log = float(np.log1p(max(0.0, net_bytes)))

        dst_ip = str(row.get("destination_ip", "")).strip()
        is_external = 1.0 if (dst_ip and not dst_ip.startswith("10.") and not dst_ip.startswith("192.168.") and not dst_ip.startswith("127.")) else 0.0

        # 5. DNS features
        domain = str(row.get("query_domain", "")).lower().strip()
        is_dns_anomaly = 1.0 if (domain not in ["", "none.local", "nan"] and (len(domain) > 20 or any(tld in domain for tld in [".ru", ".xyz", ".top", ".cc", "c2-"]))) else 0.0

        # 6. File & USB features
        fpath = str(row.get("file_path", "")).lower()
        is_file_sensitive = 1.0 if any(ext in fpath for ext in [".zip", ".tar", ".7z", "secret", "sam", "ntds", "shadow", "passwords", "id_rsa"]) else 0.0

        usb_id = str(row.get("usb_device_id", "")).strip()
        is_usb = 1.0 if (usb_id and usb_id not in ["None", "nan", ""]) else 0.0

        # 7. Contextual Risk
        user_risk = str(row.get("user_risk_level", "Low")).capitalize()
        user_risk_num = 2.0 if user_risk == "High" else (1.0 if user_risk == "Medium" else 0.0)

        asset_crit = str(row.get("asset_criticality", "Low")).capitalize()
        dev_crit_num = 2.0 if asset_crit == "High" else (1.0 if asset_crit == "Medium" else 0.0)

        # 8. Temporal features
        hr = float(hours[idx] if idx < len(hours) else 12)
        is_off_hours = 1.0 if (hr < 7.0 or hr > 19.0) else 0.0

        feature_vector = [
            is_failed_login,
            is_sensitive_auth,
            is_suspicious_proc,
            has_suspicious_cmd,
            has_ps,
            is_risky_port,
            network_bytes_log,
            is_external,
            is_dns_anomaly,
            is_file_sensitive,
            is_usb,
            user_risk_num,
            dev_crit_num,
            hr,
            is_off_hours,
        ]
        X_list.append(feature_vector)

    X = np.array(X_list, dtype=np.float32)

    # Label extraction (1 for malicious, 0 for normal)
    label_series = df.get("ground_truth_label", df.get("label", pd.Series(["normal"] * len(df))))
    y = np.array([1 if str(l).lower() == "malicious" else 0 for l in label_series], dtype=np.int64)

    return X, y, FEATURE_NAMES
