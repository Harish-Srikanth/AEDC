# AEDC: Adaptive AI Cyber Forensics with Evidence Certification

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-brightgreen.svg)](https://python.org)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115%2B-teal.svg)](https://fastapi.tiangolo.com)
[![PyTorch: 2.x](https://img.shields.io/badge/PyTorch-2.x-orange.svg)](https://pytorch.org)
[![React: 18/19](https://img.shields.io/badge/React-TypeScript-blue.svg)](https://react.dev)
[![TailwindCSS: v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com)

---

## Abstract
Modern enterprise environments generate vast volumes of fragmented, multi-source telemetry across authentication services, endpoint processes, network egress channels, DNS queries, file system modifications, and removable media. Threat actors utilize multi-stage kill chains (credential stuffing, privilege escalation, obfuscated command execution, lateral movement, and data exfiltration) designed to evade traditional rule-based SIEM detection. 

**AEDC (Adaptive AI Cyber Forensics with Evidence Certification)** is an end-to-end cyber-forensics platform that:
1. **Ingests and Correlates Multi-Source Logs**: Unified joining across 7 sensor streams (Authentication, Process, Network, DNS, File System, PowerShell, USB) and corporate registries (`devices.csv`, `users.csv`, `redteam_ground_truth.csv`).
2. **Enforces Cryptographic Non-Repudiation**: Builds an immutable **SHA-256 Merkle Hash Chain** over all canonical evidence records with real-time tampering detection and unbroken Chain of Custody logging.
3. **Executes Dual-Model AI Detection**:
   - **Random Forest Classifier**: High-precision tabular feature evaluation with stratified splits to prevent data leakage and balanced class weights.
   - **PyTorch Graph Neural Network (GNN)**: Structural topological threat propagation linking Events, Users, Devices, Destination IPs, and Processes.
   - **Configurable Adaptive Ensemble**: Dynamically fuses tabular and graph probabilities with an explainable 0–100 risk scoring model.
4. **Delivers Genuine Explainable AI (XAI)**: SHAP-style normalized feature attributions, trigger rule analysis, and automated forensic reasoning narratives.
5. **Issues Cryptographic Forensic Certificates**: Verifies 5 mandatory forensic checks before issuing digitally sealed Certificates of Authenticity with downloadable **PDF** and **JSON** forensic reports.
6. **Provides Real-Time Streaming & Simulation**: An active event replay generator clearly labelled `[SIMULATED]` streaming events via Server-Sent Events (SSE).

---

## Problem Statement & Objectives

### Problem Statement
Traditional cyber-forensic analysis suffers from three critical bottlenecks:
1. **Telemetry Fragmentation**: Logs reside in disparate silos (auth, process, network, DNS, file), requiring labor-intensive manual correlation during incident response.
2. **Evidence Repudiation & Spoliation**: Attackers frequently tamper with local event logs or audit files to conceal lateral movement. Standard tools lack cryptographic tamper-evidence guarantees.
3. **AI Black-Box Dilemma**: While modern ML models detect advanced attacks, court admissibility and forensic auditability require transparent, explainable reasoning (XAI) and formal chain-of-custody validation.

### Objectives
- Automatically ingest and correlate heterogeneous forensic datasets without hardcoded assumptions.
- Construct a deterministic SHA-256 recursive hash chain ($H_i = \text{SHA256}(H_{i-1} \parallel \text{Canonical}_i)$) with instant fracture detection.
- Train dual machine learning architectures (Random Forest + PyTorch GNN) to detect 6 primary attack types without data leakage.
- Generate authentic SHAP feature attributions and topological graph neighborhood context for every flagged event.
- Provide a court-admissible Certification Engine enforcing 5 mandatory audit checks with ReportLab PDF generation.
- Deliver an interactive, responsive dark-themed dashboard built with React, Vite, TypeScript, and Tailwind CSS.

---

## Architectural Workflow

```mermaid
graph TD
    subgraph Data Telemetry Layer
        CSV[Multi-Source Logs: Auth, Proc, Net, DNS, File, PS, USB] --> IngestionEngine[Ingestion & Normalizer]
        StreamGen[Real-Time Simulator Stream] --> IngestionEngine
    end

    subgraph Cryptographic Non-Repudiation Layer
        IngestionEngine --> Canonical[Canonical JSON Serializer]
        Canonical --> SHA256[Deterministic SHA-256 Hasher]
        SHA256 --> HashChain[Tamper-Evident Hash Chain: H_i = SHA256(H_i-1 || Rec_i)]
        HashChain --> SQLite[(Persistent SQLite Forensic DB)]
        HashChain --> Custody[Chain of Custody Ledger]
    end

    subgraph Dual AI Engine
        IngestionEngine --> FeatExt[Cyber Feature Extractor]
        FeatExt --> RF[Random Forest 100 Trees]
        FeatExt --> GraphBuilder[Evidence Graph Builder]
        GraphBuilder --> GNN[PyTorch Graph Neural Network GNN]
        RF --> Ensemble[Adaptive Ensemble: Alpha * RF + 1-Alpha * GNN]
        GNN --> Ensemble
        Ensemble --> RiskScorer[0-100 Adaptive Risk Score]
    end

    subgraph Forensic Accountability
        RF --> XAI[Explainable AI Attribution]
        GNN --> XAI
        RiskScorer --> CertificationEngine[Forensic Certification Engine]
        CertificationEngine --> PDFReport[ReportLab Forensic PDF Certificate]
        CertificationEngine --> JSONReport[Digital JSON Digest]
    end

    subgraph Presentation Console
        FastAPI[FastAPI Async REST & SSE APIs] --> ReactUI[React + Vite + TypeScript Dashboard]
        FastAPI --> SQLite
    end
```

---

## Technology Stack

| Component | Technologies Used |
|---|---|
| **Backend API** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2, SQLite / SQLAlchemy |
| **Machine Learning** | Scikit-Learn (Random Forest), PyTorch 2.x (Graph Convolutional Network), NumPy, Pandas, SHAP |
| **Forensics & Cryptography** | Python `hashlib` (SHA-256), ReportLab (PDF Certificates), Canonical JSON |
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, HTML5 Canvas |
| **Real-Time Engine** | Server-Sent Events (SSE) streaming with async generators |
| **Testing** | Pytest, FastAPI TestClient, SQLAlchemy in-memory fixtures |
| **Deployment** | Render (`render.yaml`, `Dockerfile`, `Procfile`), Vercel (`vercel.json`) |

---

## Dataset Schema & Correlation

The system ingests 10,000 multi-source events joined seamlessly on `event_id`:
- `auth_logs.csv`: Authentication method (MFA, Kerberos, Password, NTLM), status, source IP, action.
- `process_logs.csv`: Process name, parent process, command line, process ID.
- `network_logs.csv`: Source/destination IP, port, protocol, transfer bytes.
- `dns_logs.csv`: Query domain, query type, response code.
- `file_logs.csv`: File path, file action (archive, write, delete), file size.
- `powershell_logs.csv`: Executed script, execution policy.
- `usb_logs.csv`: USB device ID, mount/write actions.
- `devices.csv`: Device hostname, IP, OS, department, asset criticality (Low/Medium/High).
- `users (1).csv`: User ID, department, role, user risk level (Low/Medium/High).
- `redteam_ground_truth.csv`: Maps incidents (`INC-0001` through `INC-0006`) across 6 attack types:
  1. **Brute Force** (`INC-0001`)
  2. **Credential Abuse** (`INC-0002`)
  3. **Privilege Escalation** (`INC-0003`)
  4. **Lateral Movement** (`INC-0004`)
  5. **Command Execution** (`INC-0005`)
  6. **Data Exfiltration** (`INC-0006`)

---

## Installation & Local Execution

### Prerequisites
- Python 3.10+ (tested and verified with Python 3.10, 3.11, and 3.14)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Navigate to project root
cd "new prj"

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup
In a new terminal window:
```bash
# Navigate to frontend directory
cd "new prj/frontend"

# Install npm packages
npm install

# Start the Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Automated Tests

A comprehensive pytest test suite is provided in `backend/tests/`:
```bash
python -m pytest backend/tests/ -v
```
Tests cover:
- Cryptographic hash chain creation and determinism
- Adversarial payload tampering detection (asserts detection on modification)
- Bit-for-bit record tamper restoration
- Cybersecurity feature extraction and validation
- Random Forest training and metrics without data leakage
- PyTorch Graph Neural Network tensor construction and forward pass
- Combined adaptive ensemble weighting and score clamping
- API health check, dataset discovery, and ReportLab PDF certificate generation

---

## Forensic Integrity & Tamper Detection Guide

1. Navigate to **Evidence Ledger** or **Hash Chain & Tampering** in the dashboard.
2. Select any evidence record (e.g., `E000007` or `E000037`) and click **"Simulate Tamper"**.
3. The platform simulates an attacker altering an event payload (e.g., changing malicious label to benign).
4. Click **"Verify Entire Hash Chain"**:
   - The status banner will turn **RED (FAIL)**.
   - The system pinpoints the exact chain fracture block index and discrepancy.
5. Click **"Restore Record"** to restore the record to its authentic cryptographic state.
6. Re-running the verification will turn the status back to **GREEN (PASS)**.

---

## Production Deployment

### Backend on Render
1. Push this repository to GitHub or GitLab.
2. In Render, select **New Web Service** and link the repository.
3. Configure settings:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variable**: `PYTHON_VERSION=3.11.9`
   - **Disk**: Mount 5GB persistent disk to `/data` if persistence across dyno restarts is desired.
4. Alternatively, use the included [`backend/render.yaml`](file:///backend/render.yaml) blueprint.

### Frontend on Vercel
1. In Vercel, click **Add New Project** and import the repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. In Environment Variables, set:
   - `VITE_API_URL` = `https://<your-render-backend-url>/api`
5. Click **Deploy**. SPA rewrites are automatically handled by [`frontend/vercel.json`](file:///frontend/vercel.json).

---

## Key API Endpoints

- `GET /api/health` - Backend health status
- `GET /api/system/status` - Database, model weights, and hash chain diagnostics
- `GET /api/datasets/discover` - Auto-detect datasets and schemas
- `POST /api/datasets/ingest` - Correlate multi-source logs into hash chain
- `GET /api/evidence` - Paginated, filterable evidence ledger
- `GET /api/evidence/summary` - KPI metrics and threat statistics
- `POST /api/models/train/rf` - Train Random Forest classifier
- `POST /api/gnn/train` - Train PyTorch Graph Neural Network
- `POST /api/models/ensemble/reweight` - Adjust alpha ensemble weight dynamically
- `GET /api/xai/explain/{event_id}` - SHAP feature attributions and narrative explanation
- `GET /api/graph/topology` - Multi-entity evidence graph export
- `GET /api/timeline/events` - Chronological attack progression timeline
- `GET /api/integrity/verify` - Full hash chain cryptographic verification
- `POST /api/integrity/tamper-simulate` - Simulate adversarial record tampering
- `POST /api/integrity/restore/{id}` - Restore tampered evidence block
- `POST /api/certification/validate` - Run 5 mandatory checks and issue certificate
- `GET /api/certification/download/pdf/{id}` - Download forensic PDF certificate
- `GET /api/certification/download/json/{id}` - Download JSON certificate
- `GET /api/stream/events` - Server-Sent Events (SSE) real-time event feed

---

## Known Limitations & Considerations
1. **Browser Sandboxing**: Automated Playwright / Chromium execution inside constrained continuous-integration sandboxes may require manual driver caching or Docker container environments.
2. **Simulator Clarification**: Real-time event streaming utilizes an in-memory telemetry generator that streams realistic attack simulations labeled `[SIMULATED]`; it does not directly intercept host operating system kernel hooks unless an EDR sensor agent is installed.
3. **Storage Scaling**: SQLite is suitable for single-node deployments up to several hundred thousand events; for multi-terabyte enterprise ingest, configure `settings.database_url` to point to a high-throughput PostgreSQL cluster.
