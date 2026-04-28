import networkx as nx
import asyncio
from typing import List, Dict, Optional
from dataclasses import dataclass, field
import time

@dataclass
class PeerNode:
    """Represents a node in the mesh"""
    node_id: str
    public_key: bytes
    signal_strength: float = -60.0
    last_seen: float = field(default_factory=time.time)
    is_relay: bool = True
    battery: int = 100
    trust_score: float = 0.7


class MeshRouter:
    """
    OLSR (Optimized Link State Routing)
    Finds optimal paths between nodes
    """
    
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.graph = nx.Graph()
        self.peers: Dict[str, PeerNode] = {}
        self.routing_table: Dict[str, Dict] = {}
        self.graph.add_node(self.node_id)
    
    async def discover_peer(self, peer_node: PeerNode):
        """Register discovered peer"""
        self.peers[peer_node.node_id] = peer_node
        self.graph.add_node(peer_node.node_id)
        await self._update_routes()
    
    async def add_link(self, node_a: str, node_b: str, 
                      signal_strength: float = -60.0, latency: float = 10.0):
        """
        Add link between nodes
        Cost = inverse of signal strength + latency
        """
        # Better signal strength (closer to 0) = lower cost
        signal_cost = abs(signal_strength) / 100.0
        total_cost = signal_cost + (latency / 100.0)
        
        self.graph.add_edge(node_a, node_b, weight=total_cost)
        await self._update_routes()
    
    async def _update_routes(self):
        """Recompute all shortest paths using Dijkstra"""
        try:
            for node in self.graph.nodes():
                paths = nx.single_source_dijkstra_path(
                    self.graph, node, weight='weight'
                )
                self.routing_table[node] = paths
        except nx.NetworkXError:
            pass
    
    def get_path(self, source: str, destination: str) -> Optional[List[str]]:
        """
        Get best path from source to destination
        Returns: [source, hop1, hop2, ..., destination]
        """
        try:
            if source in self.routing_table:
                return self.routing_table[source].get(destination)
        except (KeyError, AttributeError):
            pass
        return None
    
    def get_next_hop(self, source: str, destination: str) -> Optional[str]:
        """Get next hop toward destination"""
        path = self.get_path(source, destination)
        if path and len(path) > 1:
            return path[1]
        return None
    
    def get_distance(self, source: str, destination: str) -> int:
        """Get hop count to destination"""
        path = self.get_path(source, destination)
        return len(path) - 1 if path else float('inf')
    
    def get_all_peers(self) -> List[str]:
        """Get list of all known peers"""
        return [pid for pid in self.peers.keys()]
    
    def is_reachable(self, destination: str) -> bool:
        """Check if destination is reachable"""
        return self.get_path(self.node_id, destination) is not None


# Test routing
if __name__ == "__main__":
    import asyncio
    
    async def test_routing():
        router_a = MeshRouter("A")
        router_b = MeshRouter("B")
        router_c = MeshRouter("C")
        
        # Create network: A - B - C
        await router_a.add_link("A", "B", -50, 5)
        await router_b.add_link("B", "C", -55, 5)
        await router_c.add_link("C", "B", -55, 5)
        
        # Test path finding
        path = router_a.get_path("A", "C")
        print(f"Path A→C: {path}")
        print(f"Next hop: {router_a.get_next_hop('A', 'C')}")
        print(f"Distance: {router_a.get_distance('A', 'C')} hops")
    
    asyncio.run(test_routing())
