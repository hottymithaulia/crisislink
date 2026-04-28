# Secure Mesh Network - API Specification

## Overview
RESTful API for P2P encrypted mesh messaging network.

**Base URL:** `http://localhost:8000`

---

## Authentication
None required (network is local, peers are trusted after discovery)

---

## Endpoints

### Health & Status

#### GET /health
Check server health

**Response:**
```json
{
  "status": "healthy",
  "node_id": "node_a"
}
```

---

#### GET /status
Get complete node status

**Response:**
```json
{
  "node_id": "node_a",
  "status": "online",
  "api_port": 8000,
  "known_peers": ["node_b", "node_c"],
  "messages_sent": 5,
  "messages_received": 3
}
```

---

### Peer Management

#### POST /peers/register
Register a discovered peer

**Request:**
```json
{
  "peer_id": "node_b",
  "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "signal_strength": -50.0
}
```

**Parameters:**
- `peer_id` (string): Unique identifier of peer
- `public_key` (string): PEM-encoded RSA public key
- `signal_strength` (float, optional): Signal strength in dB (-100 to -30)

**Response:**
```json
{
  "status": "registered",
  "peer_id": "node_b",
  "known_peers": ["node_b", "node_c"]
}
```

**Status Codes:**
- `200` - Peer registered successfully
- `400` - Invalid request

---

#### GET /peers
List all discovered peers with details

**Response:**
```json
{
  "node_id": "node_a",
  "total_peers": 2,
  "peers": [
    {
      "id": "node_b",
      "signal_strength": -50,
      "battery": 85,
      "trust_score": 0.92,
      "reachable": true,
      "distance": 1,
      "path": ["node_a", "node_b"]
    },
    {
      "id": "node_c",
      "signal_strength": -70,
      "battery": 60,
      "trust_score": 0.65,
      "reachable": true,
      "distance": 2,
      "path": ["node_a", "node_b", "node_c"]
    }
  ]
}
```

---

### Messaging

#### POST /messages/send
Send encrypted message to peer

**Request:**
```json
{
  "recipient_id": "node_b",
  "content": "Hello Bob!"
}
```

**Parameters:**
- `recipient_id` (string): Recipient's node ID
- `content` (string): Message content (plaintext - encrypted by API)

**Response:**
```json
{
  "status": "sent",
  "recipient": "node_b",
  "content": "Hello Bob!"
}
```

**Errors:**
```json
{
  "detail": "Cannot reach node_b"
}
```

**Status Codes:**
- `200` - Message sent successfully
- `404` - Recipient not reachable
- `400` - Invalid request

---

#### GET /messages
Retrieve all pending received messages

**Response:**
```json
{
  "node_id": "node_a",
  "pending_count": 2,
  "messages": [
    {
      "message_id": "abc123",
      "sender_id": "node_b",
      "recipient_id": "node_a",
      "content": "Hi Alice!",
      "timestamp": 1699564800.123
    },
    {
      "message_id": "def456",
      "sender_id": "node_c",
      "recipient_id": "node_a",
      "content": "Test message",
      "timestamp": 1699564805.456
    }
  ]
}
```

---

#### WebSocket /ws/messages
Real-time message streaming

**Connect:**
```bash
wscat -c ws://localhost:8000/ws/messages
```

**Receive (whenever message arrives):**
```json
{
  "message_id": "abc123",
  "sender_id": "node_b",
  "recipient_id": "node_a",
  "content": "Hello!",
  "timestamp": 1699564800.123
}
```

---

### Routing

#### GET /routing/info
Get detailed routing information

**Response:**
```json
{
  "node_id": "node_a",
  "known_peers": ["node_b", "node_c"],
  "reachable_peers": ["node_b", "node_c"],
  "messages_sent": 5,
  "peers_detail": {
    "node_b": {
      "signal": -50,
      "battery": 85,
      "trust": 0.92
    },
    "node_c": {
      "signal": -70,
      "battery": 60,
      "trust": 0.65
    }
  }
}
```

---

#### GET /routing/path/{destination}
Get optimal path to destination

**Parameters:**
- `destination` (string): Target node ID

**Response:**
```json
{
  "source": "node_a",
  "destination": "node_c",
  "path": ["node_a", "node_b", "node_c"],
  "hops": 2
}
```

**Errors:**
```json
{
  "detail": "No path to node_x"
}
```

---

## Message Flow Examples

### Example 1: Direct Message (A → B)

```
1. A discovers B
   POST /peers/register
   {
     "peer_id": "node_b",
     "public_key": "...",
     "signal_strength": -50
   }

2. A sends message to B
   POST /messages/send
   {
     "recipient_id": "node_b",
     "content": "Hi Bob!"
   }

3. B receives message
   GET /messages
   Response: [{"sender_id": "node_a", "content": "Hi Bob!"}]

4. OR use WebSocket
   WS /ws/messages
   Receive: {"sender_id": "node_a", "content": "Hi Bob!"}
```

---

### Example 2: Multi-Hop Message (A → C via B)

```
1. A discovers B
   POST /peers/register (node_b)

2. B discovers C
   POST /peers/register (node_c)

3. A discovers B discovers C
   (routing propagates)

4. A sends to C
   POST /messages/send
   {
     "recipient_id": "node_c",
     "content": "Hi Charlie!"
   }

5. Behind the scenes:
   - A encrypts for C: enc_C(message)
   - A wraps for B: enc_B(enc_C(message))
   - B decrypts outer: sees "relay to C"
   - B forwards to C: enc_C(message)
   - C decrypts: sees original message

6. C receives
   GET /messages
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid JSON, missing fields) |
| 404 | Not found (peer unreachable, no path) |
| 500 | Server error |

---

## Data Types

### Message
```typescript
{
  message_id: string          // UUID
  sender_id: string          // Source node
  recipient_id: string       // Destination node
  content: string            // Plaintext (encrypted by server)
  timestamp: number          // Unix timestamp
}
```

### Peer
```typescript
{
  id: string                 // Node ID
  signal_strength: number    // dB (-100 to -30)
  battery: number            // 0-100 %
  trust_score: number        // 0.0-1.0
  reachable: boolean         // Reachable in network
  distance: number           // Hop count
  path: string[]             // Route to peer
}
```

---

## Rate Limits
None (local network assumed)

---

## Security Notes

1. **Encryption**: Messages encrypted with AES-256-GCM
2. **Keys**: RSA-4096 for key exchange
3. **Authentication**: Built into cryptographic protocol
4. **Privacy**: Relay nodes cannot see message content
5. **Forward Secrecy**: Planned for next iteration

---

## Example Requests with cURL

### Register Peer
```bash
curl -X POST http://localhost:8000/peers/register \
  -H "Content-Type: application/json" \
  -d '{
    "peer_id": "node_b",
    "public_key": "-----BEGIN PUBLIC KEY-----...",
    "signal_strength": -50
  }'
```

### List Peers
```bash
curl http://localhost:8000/peers
```

### Send Message
```bash
curl -X POST http://localhost:8000/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "node_b",
    "content": "Hello Bob!"
  }'
```

### Get Messages
```bash
curl http://localhost:8000/messages
```

### Get Routing Info
```bash
curl http://localhost:8000/routing/info
```

### Get Path to Node
```bash
curl http://localhost:8000/routing/path/node_c
```

---

## WebSocket Example (JavaScript)

```javascript
// Connect
const ws = new WebSocket('ws://localhost:8000/ws/messages');

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(`From ${message.sender_id}: ${message.content}`);
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

---

## Python Example

```python
import requests
import asyncio
import aiohttp

async def send_message(node_url, recipient, content):
    async with aiohttp.ClientSession() as session:
        payload = {
            "recipient_id": recipient,
            "content": content
        }
        async with session.post(
            f"{node_url}/messages/send",
            json=payload
        ) as resp:
            return await resp.json()

# Usage
response = asyncio.run(
    send_message("http://localhost:8000", "node_b", "Hello!")
)
print(response)
```

---

## Status Codes Reference

```
200 OK - Request successful
201 Created - Resource created
204 No Content - Successful, no body
400 Bad Request - Malformed request
401 Unauthorized - Authentication failed
403 Forbidden - Permission denied
404 Not Found - Resource not found
500 Internal Server Error - Server error
503 Service Unavailable - Service down
```

---

## Changelog

**v1.0.0** (Current)
- Core mesh routing
- P2P encryption
- Multi-hop messaging
- REST API
- WebSocket support

**v1.1.0** (Planned)
- Perfect Forward Secrecy
- Offline message queueing
- Group messaging
- iOS support

---

*For detailed implementation, see source code in `backend/api/rest_api.py`*
