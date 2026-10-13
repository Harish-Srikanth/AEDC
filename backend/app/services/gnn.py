import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
from sqlalchemy.orm import Session

from ..config import MODELS_DIR
from ..database import EvidenceRecord, ModelArtifact
from .features import extract_cyber_features

GNN_MODEL_PATH = MODELS_DIR / "gnn_model.pt"


class GraphConvolution(nn.Module):
    """
    Standard Spectral Graph Convolutional Layer (Kipf & Welling).
    H^(l+1) = sigma( D^(-1/2) * A_hat * D^(-1/2) * H^(l) * W )
    Implemented using PyTorch sparse/dense tensor operations for universal compatibility.
    """
    def __init__(self, in_features: int, out_features: int):
        super(GraphConvolution, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = nn.Parameter(torch.FloatTensor(in_features, out_features))
        self.bias = nn.Parameter(torch.FloatTensor(out_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        # Support = X * W
        support = torch.mm(x, self.weight)
        # Output = Adj * Support
        output = torch.spmm(adj, support) if adj.is_sparse else torch.mm(adj, support)
        return output + self.bias


class ForensicsGNN(nn.Module):
    """
    Adaptive Graph Neural Network for Cyber-Forensic Evidence Graphs.
    Propagates threat signals across interconnected telemetry entities.
    """
    def __init__(self, in_features: int, hidden_dim: int = 64, num_classes: int = 2, dropout: float = 0.2):
        super(ForensicsGNN, self).__init__()
        self.gc1 = GraphConvolution(in_features, hidden_dim)
        self.gc2 = GraphConvolution(hidden_dim, hidden_dim // 2)
        self.classifier = nn.Linear(hidden_dim // 2, num_classes)
        self.dropout = dropout

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        h = F.relu(self.gc1(x, adj))
        h = F.dropout(h, p=self.dropout, training=self.training)
        h = F.relu(self.gc2(h, adj))
        logits = self.classifier(h)
        return logits


def build_evidence_graph(df: pd.DataFrame) -> Tuple[torch.Tensor, torch.Tensor, Dict[str, Any]]:
    """
    Constructs multi-entity bipartite/heterogeneous adjacency matrix and node feature tensor.
    Entities:
    - Event nodes (N_events)
    - User nodes
    - Device nodes
    - Destination IP nodes
    - Process nodes
    """
    n_events = len(df)
    
    # 1. Extract base tabular features for event nodes
    X_events, y_events, feat_names = extract_cyber_features(df)
    n_feat = X_events.shape[1]

    # 2. Build entity dictionaries
    users = {u: idx for idx, u in enumerate(df["user"].dropna().unique()) if str(u).strip()}
    devices = {d: idx for idx, d in enumerate(df["device"].dropna().unique()) if str(d).strip()}
    dst_ips = {ip: idx for idx, ip in enumerate(df["destination_ip"].dropna().unique()) if str(ip).strip()}
    processes = {p: idx for idx, p in enumerate(df["process_name"].dropna().unique()) if str(p).strip()}

    user_offset = n_events
    device_offset = user_offset + len(users)
    ip_offset = device_offset + len(devices)
    proc_offset = ip_offset + len(dst_ips)
    total_nodes = proc_offset + len(processes)

    # 3. Initialize full node feature matrix
    X_full = np.zeros((total_nodes, n_feat), dtype=np.float32)
    X_full[:n_events] = X_events

    # Aggregate entity features from connected events
    edge_list = []
    
    for i, row in df.iterrows():
        u = str(row.get("user", "")).strip()
        if u in users:
            u_node = user_offset + users[u]
            edge_list.append((i, u_node))
            edge_list.append((u_node, i))

        d = str(row.get("device", "")).strip()
        if d in devices:
            d_node = device_offset + devices[d]
            edge_list.append((i, d_node))
            edge_list.append((d_node, i))

        ip = str(row.get("destination_ip", "")).strip()
        if ip in dst_ips:
            ip_node = ip_offset + dst_ips[ip]
            edge_list.append((i, ip_node))
            edge_list.append((ip_node, i))

        p = str(row.get("process_name", "")).strip()
        if p in processes:
            p_node = proc_offset + processes[p]
            edge_list.append((i, p_node))
            edge_list.append((p_node, i))

    # Self-loops for all nodes
    for i in range(total_nodes):
        edge_list.append((i, i))

    # Average connected event features to initialize entity nodes
    for u, u_idx in users.items():
        u_node = user_offset + u_idx
        # connected events
        ev_idxs = df.index[df["user"] == u].tolist()
        if ev_idxs:
            X_full[u_node] = np.mean(X_events[ev_idxs], axis=0)

    for d, d_idx in devices.items():
        d_node = device_offset + d_idx
        ev_idxs = df.index[df["device"] == d].tolist()
        if ev_idxs:
            X_full[d_node] = np.mean(X_events[ev_idxs], axis=0)

    # Build symmetric normalized adjacency matrix
    edges = np.array(edge_list)
    rows = edges[:, 0]
    cols = edges[:, 1]
    values = np.ones(len(edges), dtype=np.float32)

    # Degree normalization: D^(-1/2) * A * D^(-1/2)
    # Using scipy sparse if available, else dense/sparse pytorch
    deg = np.zeros(total_nodes, dtype=np.float32)
    np.add.at(deg, rows, values)
    deg_inv_sqrt = np.zeros_like(deg)
    pos_mask = deg > 0
    deg_inv_sqrt[pos_mask] = np.power(deg[pos_mask], -0.5)

    norm_values = deg_inv_sqrt[rows] * values * deg_inv_sqrt[cols]

    indices = torch.LongTensor(np.vstack((rows, cols)))
    norm_tensor = torch.FloatTensor(norm_values)
    adj_matrix = torch.sparse_coo_tensor(indices, norm_tensor, torch.Size([total_nodes, total_nodes])).coalesce()
    x_tensor = torch.FloatTensor(X_full)

    meta = {
        "n_events": n_events,
        "n_users": len(users),
        "n_devices": len(devices),
        "n_ips": len(dst_ips),
        "n_procs": len(processes),
        "total_nodes": total_nodes,
        "total_edges": len(edge_list),
        "feat_names": feat_names
    }

    return x_tensor, adj_matrix, meta


def train_gnn(
    db: Session,
    epochs: int = 40,
    learning_rate: float = 0.01,
    hidden_dim: int = 64,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Trains PyTorch Graph Neural Network on topological evidence graph.
    Computes node predictions for all event nodes and updates database.
    """
    torch.manual_seed(random_state)
    np.random.seed(random_state)

    records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).all()
    if not records:
        raise ValueError("No evidence records found in database. Ingest dataset first.")

    rows = [r.to_dict() for r in records]
    df = pd.DataFrame(rows)

    # Build graph
    x_tensor, adj_matrix, meta = build_evidence_graph(df)
    n_events = meta["n_events"]

    # Labels for event nodes
    y_raw = np.array([1 if str(r.get("ground_truth_label", "")).lower() == "malicious" else 0 for r in rows], dtype=np.int64)
    y_tensor = torch.LongTensor(y_raw)

    # Train / Test indices
    train_idx, test_idx = train_test_split(
        np.arange(n_events), test_size=0.20, random_state=random_state, stratify=y_raw
    )
    train_mask = torch.LongTensor(train_idx)
    test_mask = torch.LongTensor(test_idx)

    in_features = x_tensor.shape[1]
    model = ForensicsGNN(in_features=in_features, hidden_dim=hidden_dim, num_classes=2, dropout=0.2)
    
    # Class weights for imbalanced data (~10% malicious)
    weights = torch.FloatTensor([1.0, 8.5])
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-4)

    loss_history = []
    model.train()

    for epoch in range(1, epochs + 1):
        optimizer.zero_grad()
        out = model(x_tensor, adj_matrix)
        event_out = out[:n_events]
        loss = criterion(event_out[train_mask], y_tensor[train_mask])
        loss.backward()
        optimizer.step()
        loss_history.append(round(float(loss.item()), 4))

    # Evaluation
    model.eval()
    with torch.no_grad():
        all_logits = model(x_tensor, adj_matrix)[:n_events]
        all_probs = F.softmax(all_logits, dim=1)[:, 1].numpy()
        test_pred = (all_probs[test_idx] >= 0.5).astype(int)
        y_test = y_raw[test_idx]

        acc = float(accuracy_score(y_test, test_pred))
        prec = float(precision_score(y_test, test_pred, zero_division=0))
        rec = float(recall_score(y_test, test_pred, zero_division=0))
        f1 = float(f1_score(y_test, test_pred, zero_division=0))
        try:
            roc_auc = float(roc_auc_score(y_test, all_probs[test_idx]))
        except Exception:
            roc_auc = 0.5
        cm = confusion_matrix(y_test, test_pred).tolist()

    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm,
        "loss_history": loss_history,
        "epochs": epochs,
        "graph_meta": meta,
        "test_size": len(test_idx),
        "train_size": len(train_idx),
    }

    # Save model weights
    torch.save(model.state_dict(), GNN_MODEL_PATH)

    # Store artifact
    trained_at = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
    artifact = db.query(ModelArtifact).filter(ModelArtifact.id == "gnn_model").first()
    if not artifact:
        artifact = ModelArtifact(
            id="gnn_model",
            version="1.0.0",
            trained_at=trained_at,
            metrics=json.dumps(metrics),
            parameters=json.dumps({"epochs": epochs, "hidden_dim": hidden_dim, "lr": learning_rate})
        )
        db.add(artifact)
    else:
        artifact.trained_at = trained_at
        artifact.metrics = json.dumps(metrics)
        artifact.parameters = json.dumps({"epochs": epochs, "hidden_dim": hidden_dim, "lr": learning_rate})

    # Update predictions in database aligned with evidence_id
    for idx, rec in enumerate(records):
        rec.gnn_prediction = float(all_probs[idx])

    db.commit()

    return {
        "model_type": "Graph Neural Network (GNN)",
        "version": "1.0.0",
        "trained_at": trained_at,
        "metrics": metrics
    }
