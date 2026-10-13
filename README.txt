AEDC Synthetic Multi-Source Cyber Forensics Dataset

Purpose:
Synthetic, interconnected evidence for demonstrating an Adaptive/AI-driven
cyber-forensic correlation system without processing huge real-world datasets.

Main event files:
- auth_logs.csv
- process_logs.csv
- network_logs.csv
- dns_logs.csv
- file_logs.csv
- powershell_logs.csv
- usb_logs.csv

Reference/ground truth:
- redteam_ground_truth.csv
- users.csv
- devices.csv

Labels:
normal / malicious
Attack types include:
Brute Force, Credential Abuse, Privilege Escalation, Lateral Movement,
Command Execution, Data Exfiltration.

The same event_id, user, device, timestamp, and incident_id fields are
used across sources so the records can be correlated into an evidence graph.
