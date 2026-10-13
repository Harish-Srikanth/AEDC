from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database import EvidenceRecord


def get_interactive_graph(
    db: Session,
    focus_evidence_id: Optional[str] = None,
    attack_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    user: Optional[str] = None,
    device: Optional[str] = None,
    limit: int = 150
) -> Dict[str, Any]:
    """
    Constructs a rich multi-entity graph structure for frontend Canvas/SVG/Force visualizer.
    Returns nodes and edges linking Events to Users, Devices, IPs, Processes, Domains, and USB devices.
    """
    query = db.query(EvidenceRecord)

    if focus_evidence_id:
        query = query.filter(EvidenceRecord.evidence_id == focus_evidence_id)
    else:
        if attack_type:
            query = query.filter(EvidenceRecord.attack_type == attack_type)
        if risk_level:
            query = query.filter(EvidenceRecord.risk_level == risk_level)
        if user:
            query = query.filter(EvidenceRecord.user == user)
        if device:
            query = query.filter(EvidenceRecord.device == device)
        
        # Prioritize suspicious or malicious records for high investigative value
        query = query.order_by(
            EvidenceRecord.is_tampered.desc(),
            EvidenceRecord.combined_score.desc().nullslast(),
            EvidenceRecord.id.asc()
        ).limit(limit)

    records = query.all()

    nodes_dict: Dict[str, Dict[str, Any]] = {}
    edges_list: List[Dict[str, Any]] = []

    for r in records:
        ev_node_id = f"ev:{r.evidence_id}"
        is_mal = (r.ground_truth_label == "malicious") or ((r.combined_score or 0) >= 70.0)
        
        # 1. Event node
        nodes_dict[ev_node_id] = {
            "id": ev_node_id,
            "evidence_id": r.evidence_id,
            "name": r.evidence_id,
            "type": "event",
            "risk_score": r.combined_score or 15.0,
            "risk_level": r.risk_level or "Low",
            "is_malicious": is_mal,
            "attack_type": r.attack_type,
            "timestamp": r.timestamp,
            "is_tampered": r.is_tampered,
            "details": f"{r.action or 'Event'} on {r.device}"
        }

        # 2. User node
        if r.user:
            u_node_id = f"user:{r.user}"
            if u_node_id not in nodes_dict:
                nodes_dict[u_node_id] = {
                    "id": u_node_id,
                    "name": r.user,
                    "type": "user",
                    "risk_level": r.user_risk_level,
                    "is_malicious": r.user_risk_level == "High",
                    "details": f"User: {r.user} ({r.user_risk_level} Risk)"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": u_node_id,
                "type": "PERFORMED_BY",
                "label": "user"
            })

        # 3. Device node
        if r.device:
            d_node_id = f"dev:{r.device}"
            if d_node_id not in nodes_dict:
                nodes_dict[d_node_id] = {
                    "id": d_node_id,
                    "name": r.device,
                    "type": "device",
                    "risk_level": r.asset_criticality,
                    "is_malicious": r.asset_criticality == "High",
                    "details": f"Host: {r.device} ({r.asset_criticality} Criticality)"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": d_node_id,
                "type": "HOSTED_ON",
                "label": "device"
            })

        # 4. Destination IP node
        if r.destination_ip and r.destination_ip not in ["", "none", "127.0.0.1"]:
            ip_node_id = f"ip:{r.destination_ip}"
            is_ext = not (r.destination_ip.startswith("10.") or r.destination_ip.startswith("192.168."))
            if ip_node_id not in nodes_dict:
                nodes_dict[ip_node_id] = {
                    "id": ip_node_id,
                    "name": r.destination_ip,
                    "type": "destination_ip",
                    "risk_level": "High" if is_ext else "Low",
                    "is_malicious": is_ext,
                    "details": f"IP: {r.destination_ip}:{r.destination_port or ''}"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": ip_node_id,
                "type": "CONNECTED_TO",
                "label": f":{r.destination_port}" if r.destination_port else "egress"
            })

        # 5. Process node
        if r.process_name and r.process_name not in ["", "none", "unknown.exe"]:
            p_node_id = f"proc:{r.process_name}"
            is_susp_proc = r.process_name.lower() in ["powershell.exe", "cmd.exe", "certutil.exe", "mimikatz.exe"]
            if p_node_id not in nodes_dict:
                nodes_dict[p_node_id] = {
                    "id": p_node_id,
                    "name": r.process_name,
                    "type": "process",
                    "risk_level": "High" if is_susp_proc else "Low",
                    "is_malicious": is_susp_proc,
                    "details": f"Process: {r.process_name}"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": p_node_id,
                "type": "EXECUTED",
                "label": "spawned"
            })

        # 6. Query Domain node
        if r.query_domain and r.query_domain not in ["none.local", ""]:
            dom_node_id = f"dom:{r.query_domain}"
            is_mal_dom = any(t in r.query_domain for t in [".ru", ".xyz", "c2-"])
            if dom_node_id not in nodes_dict:
                nodes_dict[dom_node_id] = {
                    "id": dom_node_id,
                    "name": r.query_domain,
                    "type": "domain",
                    "risk_level": "High" if is_mal_dom else "Low",
                    "is_malicious": is_mal_dom,
                    "details": f"DNS Domain: {r.query_domain}"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": dom_node_id,
                "type": "RESOLVED",
                "label": "dns"
            })

        # 7. USB Device node
        if r.usb_device_id and r.usb_device_id not in ["None", ""]:
            usb_node_id = f"usb:{r.usb_device_id}"
            if usb_node_id not in nodes_dict:
                nodes_dict[usb_node_id] = {
                    "id": usb_node_id,
                    "name": r.usb_device_id,
                    "type": "usb",
                    "risk_level": "Medium",
                    "is_malicious": False,
                    "details": f"Removable Media: {r.usb_device_id}"
                }
            edges_list.append({
                "source": ev_node_id,
                "target": usb_node_id,
                "type": "ATTACHED_USB",
                "label": "usb"
            })

    return {
        "nodes": list(nodes_dict.values()),
        "edges": edges_list,
        "total_nodes": len(nodes_dict),
        "total_edges": len(edges_list),
    }
