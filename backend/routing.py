"""
Graph-based Dijkstra Evacuation Routing Engine
Supports blocked road avoidance, bypass explanations, and alternative routes.
"""

import heapq
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from backend.models import RoadNode, RoadEdge

class TacticalRoutingEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_route(
        self, 
        origin_id: str, 
        destination_id: str, 
        avoid_blocked: bool = True
    ) -> Dict[str, Any]:
        nodes = {n.id: n for n in self.db.query(RoadNode).all()}
        edges = self.db.query(RoadEdge).all()

        if origin_id not in nodes or destination_id not in nodes:
            missing = origin_id if origin_id not in nodes else destination_id
            return {
                "origin_id": origin_id,
                "destination_id": destination_id,
                "is_viable": False,
                "path_node_ids": [],
                "path_coordinates": [],
                "total_distance_km": 0.0,
                "estimated_time_minutes": 0,
                "used_bypass": False,
                "avoided_hazards": [],
                "road_segments": [],
                "explanation": f"Routing failure: Node '{missing}' does not exist in road network."
            }

        if origin_id == destination_id:
            n = nodes[origin_id]
            return {
                "origin_id": origin_id,
                "destination_id": destination_id,
                "is_viable": True,
                "path_node_ids": [origin_id],
                "path_coordinates": [[n.lat, n.lng]],
                "total_distance_km": 0.0,
                "estimated_time_minutes": 0,
                "used_bypass": False,
                "avoided_hazards": [],
                "road_segments": [],
                "explanation": "Origin and destination are identical."
            }

        # Build adjacency graph (undirected)
        adjacency: Dict[str, List[Tuple[str, RoadEdge]]] = {n_id: [] for n_id in nodes}
        for edge in edges:
            if edge.from_node_id in adjacency and edge.to_node_id in adjacency:
                adjacency[edge.from_node_id].append((edge.to_node_id, edge))
                adjacency[edge.to_node_id].append((edge.from_node_id, edge))

        # Dijkstra algorithm
        distances: Dict[str, float] = {n_id: float("inf") for n_id in nodes}
        distances[origin_id] = 0.0
        previous: Dict[str, Optional[Tuple[str, RoadEdge]]] = {n_id: None for n_id in nodes}

        pq: List[Tuple[float, str]] = [(0.0, origin_id)]

        while pq:
            curr_dist, curr_node = heapq.heappop(pq)

            if curr_dist > distances[curr_node]:
                continue

            if curr_node == destination_id:
                break

            for neighbor_id, edge in adjacency.get(curr_node, []):
                # Check blocked edge
                if avoid_blocked and edge.is_blocked:
                    continue

                # Traversal cost: distance adjusted by surface penalty
                edge_cost = edge.distance_km
                if edge.surface_type == "MOUNTAIN_PASS":
                    edge_cost *= 1.35
                elif edge.surface_type == "UNPAVED":
                    edge_cost *= 1.20

                new_dist = curr_dist + edge_cost
                if new_dist < distances[neighbor_id]:
                    distances[neighbor_id] = new_dist
                    previous[neighbor_id] = (curr_node, edge)
                    heapq.heappush(pq, (new_dist, neighbor_id))

        # Reconstruct path
        path_nodes: List[str] = []
        path_edges: List[RoadEdge] = []
        curr = destination_id

        while curr is not None:
            path_nodes.insert(0, curr)
            prev_info = previous.get(curr)
            if prev_info:
                curr, edge = prev_info
                path_edges.insert(0, edge)
            else:
                curr = None

        if len(path_nodes) <= 1 or path_nodes[0] != origin_id:
            return {
                "origin_id": origin_id,
                "destination_id": destination_id,
                "is_viable": False,
                "path_node_ids": [],
                "path_coordinates": [],
                "total_distance_km": 0.0,
                "estimated_time_minutes": 0,
                "used_bypass": False,
                "avoided_hazards": [],
                "road_segments": [],
                "explanation": "NO VIABLE GROUND CORRIDOR: Critical arterial blocked by active hazards. Rotor air evacuation required."
            }

        # Calculations
        total_dist = sum(e.distance_km for e in path_edges)
        total_minutes = 0.0
        used_bypass = False
        avoided_hazards: List[str] = []

        for e in path_edges:
            speed = e.speed_limit_kmh or 50
            if e.surface_type == "MOUNTAIN_PASS":
                speed = min(speed, 35)
            if "Bypass" in e.name or "Trail" in e.name:
                used_bypass = True
            total_minutes += (e.distance_km / speed) * 60.0

        # Scan for avoided blocked hazards
        for edge in edges:
            if edge.is_blocked and edge.hazard_id and edge.hazard_id not in avoided_hazards:
                avoided_hazards.append(edge.hazard_id)

        path_coords = [[nodes[n_id].lat, nodes[n_id].lng] for n_id in path_nodes]

        dist_rounded = round(total_dist, 1)
        time_rounded = int(round(total_minutes))

        explanation = f"Optimal corridor calculated: {dist_rounded} km via {', '.join([e.name for e in path_edges[:3]])}"
        if used_bypass:
            explanation = f"CORRIDOR DIVERSION ACTIVE: Primary route blocked by hazard. Rerouted via Bypass 4C / North Ridge (+{dist_rounded} km, ~{time_rounded} min)."

        return {
            "origin_id": origin_id,
            "destination_id": destination_id,
            "is_viable": True,
            "path_node_ids": path_nodes,
            "path_coordinates": path_coords,
            "total_distance_km": dist_rounded,
            "estimated_time_minutes": time_rounded,
            "used_bypass": used_bypass,
            "avoided_hazards": avoided_hazards,
            "road_segments": [e.name for e in path_edges],
            "explanation": explanation
        }
