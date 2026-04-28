from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import os
from core.message_handler import MessagePipeline, Message
from core.routing import PeerNode

# Global pipeline instance
pipeline = None
APP_PORT = int(os.getenv("APP_PORT", 8000))
NODE_ID = os.getenv("NODE_ID", "mesh_node")

app = FastAPI(
    title="Secure Mesh Network API",
    description="P2P encrypted mesh messaging",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PeerRegisterRequest(BaseModel):
    peer_id: str
    public_key: str
    signal_strength: float = -60.0


class SendMessageRequest(BaseModel):
    recipient_id: str
    content: str


class MessageResponse(BaseModel):
    status: str
    message_id: str = None
    error: str = None


@app.on_event("startup")
async def startup():
    """Initialize mesh network on startup"""
    global pipeline
    pipeline = MessagePipeline(NODE_ID)
    print(f"✅ Mesh Network Started - Node: {NODE_ID}")
    print(f"📡 API listening on http://0.0.0.0:{APP_PORT}")


@app.get("/status")
async def get_status():
    """Get node status"""
    return {
        "node_id": NODE_ID,
        "status": "online",
        "api_port": APP_PORT,
        "known_peers": list(pipeline.peers.keys()),
        "messages_sent": len(pipeline.sent_messages),
        "messages_received": len(pipeline.message_history)
    }


@app.post("/peers/register")
async def register_peer(request: PeerRegisterRequest):
    """
    Register a discovered peer
    
    Example:
    POST /peers/register
    {
        "peer_id": "node_b",
        "public_key": "-----BEGIN PUBLIC KEY-----...",
        "signal_strength": -50.0
    }
    """
    try:
        # Convert public key from string to bytes
        public_key_bytes = request.public_key.encode()
        
        # Register peer
        await pipeline.register_peer(
            request.peer_id,
            public_key_bytes,
            request.signal_strength
        )
        
        print(f"✅ Peer registered: {request.peer_id}")
        
        return {
            "status": "registered",
            "peer_id": request.peer_id,
            "known_peers": list(pipeline.peers.keys())
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/peers")
async def get_peers():
    """Get list of discovered peers"""
    peers_info = []
    
    for peer_id, peer in pipeline.peers.items():
        path = pipeline.router.get_path(pipeline.node_id, peer_id)
        distance = pipeline.router.get_distance(pipeline.node_id, peer_id)
        
        peers_info.append({
            "id": peer_id,
            "signal_strength": peer.signal_strength,
            "battery": peer.battery,
            "trust_score": peer.trust_score,
            "reachable": path is not None,
            "distance": distance,
            "path": path
        })
    
    return {
        "node_id": NODE_ID,
        "total_peers": len(peers_info),
        "peers": peers_info
    }


@app.post("/messages/send")
async def send_message(request: SendMessageRequest):
    """
    Send encrypted message to peer
    
    Example:
    POST /messages/send
    {
        "recipient_id": "node_b",
        "content": "Hello from node_a!"
    }
    """
    try:
        success = await pipeline.send_message(
            request.recipient_id,
            request.content
        )
        
        if success:
            return {
                "status": "sent",
                "recipient": request.recipient_id,
                "content": request.content
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Cannot reach {request.recipient_id}"
            )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/messages")
async def get_messages():
    """Get all pending received messages"""
    messages = await pipeline.get_pending_messages()
    
    return {
        "node_id": NODE_ID,
        "pending_count": len(messages),
        "messages": messages
    }


@app.websocket("/ws/messages")
async def websocket_messages(websocket: WebSocket):
    """
    WebSocket for real-time messages
    Connect and receive messages as they arrive
    """
    await websocket.accept()
    print(f"🔌 WebSocket client connected")
    
    try:
        while True:
            # Check for new messages every 100ms
            if not pipeline.message_queue.empty():
                message = await pipeline.message_queue.get()
                await websocket.send_json(message.to_dict())
            
            await asyncio.sleep(0.1)
    
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        print(f"🔌 WebSocket client disconnected")


@app.get("/routing/info")
async def get_routing_info():
    """Get detailed routing information"""
    return pipeline.get_routing_info()


@app.get("/routing/path/{destination}")
async def get_path_to(destination: str):
    """Get path to specific destination"""
    path = pipeline.router.get_path(pipeline.node_id, destination)
    
    if not path:
        raise HTTPException(status_code=404, detail=f"No path to {destination}")
    
    return {
        "source": pipeline.node_id,
        "destination": destination,
        "path": path,
        "hops": len(path) - 1
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "node_id": NODE_ID}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=APP_PORT,
        log_level="info"
    )
