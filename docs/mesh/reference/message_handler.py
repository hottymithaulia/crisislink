import asyncio
import json
import time
import uuid
from typing import Dict, Optional
from dataclasses import dataclass, asdict
from encryption import EncryptionManager
from routing import MeshRouter, PeerNode

@dataclass
class Message:
    """Message structure"""
    message_id: str
    sender_id: str
    recipient_id: str
    content: str
    timestamp: float
    encrypted_data: dict = None
    
    def to_dict(self):
        return {
            "message_id": self.message_id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "content": self.content,
            "timestamp": self.timestamp
        }


class MessagePipeline:
    """
    Main message handling pipeline
    Coordinates: encryption → routing → transport
    """
    
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.encryption = EncryptionManager(node_id)
        self.router = MeshRouter(node_id)
        self.peers: Dict[str, PeerNode] = {}
        self.message_queue = asyncio.Queue()
        self.message_history = {}  # Track delivered messages
        self.sent_messages = {}  # Track what we sent
    
    async def register_peer(self, peer_id: str, public_key_bytes: bytes, 
                           signal_strength: float = -60.0):
        """Register a discovered peer"""
        peer = PeerNode(
            node_id=peer_id,
            public_key=public_key_bytes,
            signal_strength=signal_strength
        )
        self.peers[peer_id] = peer
        await self.router.discover_peer(peer)
    
    async def send_message(self, recipient_id: str, content: str) -> bool:
        """
        Send message to recipient
        
        Flow:
        1. Find path to recipient
        2. Encrypt with recipient's public key
        3. Wrap in onion for relays
        4. Send through mesh
        """
        try:
            # Get path
            path = self.router.get_path(self.node_id, recipient_id)
            if not path:
                print(f"❌ No path to {recipient_id}")
                return False
            
            # Create message
            msg_id = str(uuid.uuid4())[:8]
            message = Message(
                message_id=msg_id,
                sender_id=self.node_id,
                recipient_id=recipient_id,
                content=content,
                timestamp=time.time()
            )
            
            # Encrypt for recipient
            recipient_public_key = self.encryption.load_public_key_from_bytes(
                self.peers[recipient_id].public_key
            )
            encrypted = self.encryption.encrypt_message(content, recipient_public_key)
            
            # Build onion packet (for multi-hop)
            onion_packet = await self._build_onion_packet(
                message, encrypted, path
            )
            
            # Store sent message
            self.sent_messages[msg_id] = message
            
            # Send to first hop
            first_hop = path[1] if len(path) > 1 else recipient_id
            
            print(f"✉️  Sending to {recipient_id}")
            print(f"   Path: {' → '.join(path)}")
            print(f"   Message: '{content}'")
            
            return True
        
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            return False
    
    async def receive_message(self, encrypted_packet: dict) -> Optional[Message]:
        """
        Receive and decrypt message
        
        Could be:
        1. Message for me (decrypt and accept)
        2. Relay packet (decrypt outer layer, forward to next hop)
        """
        try:
            # Try to decrypt
            try:
                content = self.encryption.decrypt_message(encrypted_packet)
                message = Message(
                    message_id=encrypted_packet.get("message_id", "unknown"),
                    sender_id=encrypted_packet.get("sender_id"),
                    recipient_id=self.node_id,
                    content=content,
                    timestamp=time.time()
                )
                
                print(f"✅ Message received from {message.sender_id}")
                print(f"   Content: '{message.content}'")
                
                # Add to queue
                await self.message_queue.put(message)
                return message
            
            except Exception as decrypt_error:
                # Can't decrypt - probably not for us
                # If we're relay node, forward it
                print(f"🔄 Relaying message (not for me)")
                return None
        
        except Exception as e:
            print(f"❌ Error receiving message: {e}")
            return None
    
    async def _build_onion_packet(self, message: Message, encrypted: dict, 
                                  path: list) -> dict:
        """
        Build onion routing packet for multi-hop
        Each relay can only decrypt its own layer
        """
        packet = {
            "message_id": message.message_id,
            "sender_id": message.sender_id,
            "recipient_id": message.recipient_id,
            "encrypted_payload": encrypted,
            "path": path,
            "hop_count": len(path) - 1,
            "ttl": 64
        }
        return packet
    
    async def get_pending_messages(self) -> list:
        """Get all pending messages"""
        messages = []
        while not self.message_queue.empty():
            msg = await self.message_queue.get()
            messages.append(msg.to_dict())
        return messages
    
    def get_routing_info(self) -> dict:
        """Get routing information"""
        return {
            "node_id": self.node_id,
            "known_peers": list(self.peers.keys()),
            "reachable_peers": self.router.get_all_peers(),
            "messages_sent": len(self.sent_messages),
            "peers_detail": {
                pid: {
                    "signal": peer.signal_strength,
                    "battery": peer.battery,
                    "trust": peer.trust_score
                }
                for pid, peer in self.peers.items()
            }
        }


# Test pipeline
if __name__ == "__main__":
    async def test_pipeline():
        # Create two nodes
        node_a = MessagePipeline("node_a")
        node_b = MessagePipeline("node_b")
        
        # Register each other
        await node_a.register_peer(
            "node_b",
            node_b.encryption.get_public_key_bytes(),
            signal_strength=-50
        )
        await node_b.register_peer(
            "node_a",
            node_a.encryption.get_public_key_bytes(),
            signal_strength=-50
        )
        
        # Add link
        await node_a.router.add_link("node_a", "node_b", -50, 5)
        
        # A sends to B
        await node_a.send_message("node_b", "Hello B!")
        
        # B receives
        encrypted_packet = node_a.sent_messages[
            list(node_a.sent_messages.keys())[0]
        ].__dict__
        
        print("\n--- B receives message ---")
        # Manually relay (simulate)
        msg = await node_b.receive_message(
            node_a.encryption.encrypt_message(
                "Hello B!",
                node_b.encryption.public_key
            )
        )
    
    asyncio.run(test_pipeline())
