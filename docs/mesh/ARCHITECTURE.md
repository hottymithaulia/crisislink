# Secure Mesh Network - Architecture

## System Overview

```
┌─────────────────────────────────────────────┐
│         APPLICATION LAYER (Android)         │
│    UI for messaging, peer discovery         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      REST API / WebSocket (FastAPI)         │
│      /messages, /peers, /routing            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        MESSAGE PIPELINE LAYER               │
│  - Send/receive messages                    │
│  - Encryption/decryption                    │
│  - Onion routing for multi-hop              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      CORE MODULES                           │
│  ├─ Encryption (RSA-4096 + AES-256-GCM)   │
│  ├─ Routing (OLSR algorithm)                │
│  └─ Discovery (mDNS/Bonjour)                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      TRANSPORT LAYER                        │
│  ├─ WiFi Direct (P2P sockets)               │
│  ├─ Bluetooth Low Energy (BLE)              │
│  └─ Network interface abstraction           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        HARDWARE / OS                        │
│  WiFi, BLE, Network drivers                 │
└─────────────────────────────────────────────┘
```

---

## Layer Details

### 1. Application Layer
**Platform:** Android (Kotlin)  
**Framework:** Jetpack Compose  
**Responsibilities:**
- User interface (chat, peer list)
- Local message storage
- Notification handling
- WiFi Direct / BLE management

---

### 2. REST API Layer
**Technology:** FastAPI (Python)  
**Port:** 8000 (configurable)  
**Responsibilities:**
- HTTP endpoint handling
- WebSocket management
- Request validation
- Response formatting

**Key Endpoints:**
```
POST   /peers/register          Register peer
GET    /peers                   List peers
POST   /messages/send           Send message
GET    /messages                Get messages
WS     /ws/messages             Real-time messages
GET    /routing/info            Routing info
```

---

### 3. Message Pipeline Layer
**Module:** `backend/core/message_handler.py`  
**Class:** `MessagePipeline`  
**Responsibilities:**
- Message creation and validation
- Encryption coordination
- Routing decisions
- Relay detection

**Flow:**
```
User Input
    ↓
MessagePipeline.send_message()
    ├─ Router.get_path() → Find route
    ├─ Encryption.encrypt() → Encrypt for recipient
    ├─ OnionRouter.wrap() → Wrap for relays
    └─ Transport.send() → Send packet
```

---

### 4. Core Modules

#### A. Encryption Module
**File:** `backend/core/encryption.py`  
**Class:** `EncryptionManager`

**Algorithm Stack:**
```
Message Encryption:
  1. Random AES-256 key generated
  2. Message encrypted with AES-256-GCM
  3. AES key encrypted with RSA-4096 public key
  4. Sent: {encrypted_key, iv, ciphertext, tag}

Decryption:
  1. RSA-4096 private key decrypts AES key
  2. AES-256-GCM decrypts message with key
  3. Original message retrieved
```

**Security Properties:**
- 256-bit symmetric encryption
- 4096-bit asymmetric encryption
- Authenticated encryption (GCM mode)
- OAEP padding for RSA

---

#### B. Routing Module
**File:** `backend/core/routing.py`  
**Class:** `MeshRouter`

**Algorithm:** OLSR (Optimized Link State Routing)

```
Graph Representation:
  - Nodes = Peers
  - Edges = Direct links (WiFi/BLE)
  - Weight = Cost (inverse signal strength + latency)

Path Finding:
  Dijkstra's algorithm → Optimal path A → C
  
Example:
  A (node) ←──(-50dB, 10ms)──→ B ←──(-55dB, 12ms)──→ C
  Cost(A→B) = 0.5 + 0.1 = 0.6
  Cost(B→C) = 0.55 + 0.12 = 0.67
  
  Path A→C = [A, B, C] (2 hops)
  Next hop from A = B
```

**Routing Table:**
```python
routing_table[source][destination] = [path, with, hops]
```

---

#### C. Service Discovery Module
**Technology:** mDNS/Bonjour  
**Uses:** zeroconf library

```
Discovery Flow:
  1. Node A broadcasts: "mesh._tcp.local" service
  2. Node B sees broadcast
  3. Node A & B exchange public keys
  4. Automatic peer registration
```

---

### 5. Transport Layer

#### WiFi Direct
**Technology:** WiFi P2P (Android)  
**Connection Model:**
```
Phone A ←─ WiFi P2P ─→ Phone B
(Group Owner)        (Client)
```

**Python Socket Wrapper:**
```python
# Open socket to peer
socket.connect((peer_ip, 5555))
socket.send(encrypted_packet)
```

#### Bluetooth Low Energy
**Technology:** BLE Mesh  
**Connection Model:**
```
Phone A ←─ BLE ─→ Phone B (Relay)
Low power (~5m range)
Lower bandwidth (~1 Mbps)
```

**Fallback:** When WiFi unavailable

---

## Message Flow Example

### Scenario: A sends to C via B

```
SENDER (Node A):
┌────────────────────────────────┐
│ User: "Hello Charlie"          │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ MessagePipeline.send_message() │
├────────────────────────────────┤
│ 1. Get path A→C:               │
│    Router.get_path("A", "C")   │
│    → ["A", "B", "C"]           │
│                                │
│ 2. Encrypt for C:              │
│    enc_C = Encrypt(           │
│      "Hello Charlie",          │
│      C_public_key             │
│    )                           │
│                                │
│ 3. Build onion packet:         │
│    packet = {                  │
│      path: ["A", "B", "C"],   │
│      encrypted: enc_C          │
│    }                           │
│                                │
│ 4. Send to first hop (B):      │
│    Transport.send("B", packet) │
└────────┬───────────────────────┘
         │
         ▼ (WiFi Direct)

RELAY (Node B):
┌────────────────────────────────┐
│ Receive from A                 │
│                                │
│ Try to decrypt:                │
│ decrypt(encrypted)             │
│ → Can't decrypt!               │
│   (Message encrypted for C,    │
│    B doesn't have key)         │
│                                │
│ But packet says:               │
│ "Forward to C"                 │
│                                │
│ So B just relays forward:      │
│ Transport.send("C", packet)    │
└────────┬───────────────────────┘
         │
         ▼ (WiFi Direct)

RECEIVER (Node C):
┌────────────────────────────────┐
│ Receive from B                 │
│                                │
│ Decrypt with private key:      │
│ decrypt(encrypted) →           │
│ "Hello Charlie"                │
│                                │
│ Message queue:                 │
│ {                              │
│   sender: "A",                 │
│   content: "Hello Charlie"     │
│ }                              │
│                                │
│ → UI shows message             │
└────────────────────────────────┘
```

---

## Encryption Pipeline Detail

```
┌─────────────────────────────────────────┐
│ ENCRYPTION PIPELINE                     │
│                                         │
│ Input: plaintext message               │
│ Output: encrypted packet               │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 1. Generate AES-256 Key                 │
│    aes_key = os.urandom(32)             │
│    (256 bits = 32 bytes)                │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 2. Generate IV for GCM                  │
│    iv = os.urandom(16)                  │
│    (128 bits = 16 bytes)                │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 3. Encrypt with AES-256-GCM             │
│    cipher = AES(aes_key)                │
│    ciphertext = cipher(plaintext)       │
│    tag = cipher.tag (authentication)    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 4. Encrypt AES Key with RSA-4096        │
│    encrypted_key = RSA_public.encrypt(  │
│      aes_key                            │
│    )                                    │
│    (4096-bit = 512 bytes)               │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ 5. Package Result                       │
│    {                                    │
│      encrypted_key: <hex>,              │
│      iv: <hex>,                         │
│      ciphertext: <hex>,                 │
│      tag: <hex>                         │
│    }                                    │
│                                         │
│ Total size: ~512 + 16 + msg_size + 16  │
└─────────────────────────────────────────┘
```

---

## State Diagram: Node Lifecycle

```
         Start
           │
           ▼
    ┌─────────────┐
    │  Discovering│ ← Broadcast on mDNS
    └──────┬──────┘
           │
           ├─ Peer found
           │
           ▼
    ┌─────────────┐
    │  Connected  │ ← Exchange keys
    └──────┬──────┘
           │
           ├─ Can send/relay messages
           │
    ┌──────▼──────┐
    │  Messaging  │ ← Active messaging
    └──────┬──────┘
           │
           ├─ No activity
           │
           ▼
    ┌─────────────┐
    │   Idle      │ ← Heartbeat keeps alive
    └──────┬──────┘
           │
           ├─ Timeout
           │
           ▼
    ┌─────────────┐
    │ Disconnected│ ← No longer reachable
    └─────────────┘
```

---

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Key generation | 2-5s | One-time (cached) |
| Encrypt message | 50-100ms | AES-256-GCM |
| Decrypt message | 50-100ms | RSA + AES |
| Route lookup | 5-10ms | Dijkstra |
| Path find (100 nodes) | 20-50ms | Graph search |
| Message relay | 10-20ms | No decryption |
| WiFi Direct send | 5-50ms | Network latency |
| BLE send | 10-100ms | Lower bandwidth |

---

## Scaling Characteristics

| Metric | Limit | Mitigation |
|--------|-------|-----------|
| Peers per node | ~100 | Graph optimization |
| Message rate | 1000 msg/s | Queue management |
| Network diameter | 10 hops | Route caching |
| Memory (routing) | ~1MB per 100 nodes | Distributed routing |

---

## Security Model

```
┌─────────────────────────────────────────┐
│ THREAT MODEL & DEFENSES                 │
├─────────────────────────────────────────┤
│                                         │
│ THREAT: Eavesdropping                   │
│ DEFENSE: AES-256-GCM encryption         │
│                                         │
│ THREAT: Relay reading message           │
│ DEFENSE: Onion routing + RSA             │
│                                         │
│ THREAT: Man-in-the-middle               │
│ DEFENSE: Public key cryptography        │
│          (future: certificate pinning)  │
│                                         │
│ THREAT: Replay attacks                  │
│ DEFENSE: GCM tag prevents tampering      │
│          Timestamp in message           │
│                                         │
│ THREAT: DDoS (message flooding)         │
│ DEFENSE: Rate limiting (future)         │
│          Message validation             │
│                                         │
└─────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
╔════════════════╗
║   User Input   ║
╚────────┬───────╝
         │ "Send to Bob"
         ▼
╔════════════════════════════╗
║  REST API /messages/send   ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  MessagePipeline           ║
│  - Validate recipient      │
│  - Check reachability      ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  EncryptionManager         ║
│  - Generate AES key        │
│  - Encrypt with AES-256    │
│  - Encrypt key with RSA    ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  Router                    ║
│  - Find path to recipient  │
│  - Get next hop            ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  Transport Layer           ║
│  - WiFi Direct socket      │
│  - Or BLE connection       ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  Network Interface         ║
│  - Send to peer            ║
╚────────┬───────────────────╝
         │
         ▼
┌────────────────────────────┐
│    Encrypted Packet        │
│  Over WiFi/BLE            │
└────────┬───────────────────┘
         │
         ▼ (at receiver)
╔════════════════════════════╗
║  Transport Layer (recv)    ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  MessagePipeline.receive() ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  EncryptionManager         ║
│  - Decrypt RSA key         │
│  - Decrypt AES message     ║
╚────────┬───────────────────╝
         │
         ▼
╔════════════════════════════╗
║  Message Queue             ║
╚────────┬───────────────────╝
         │
         ▼
┌────────────────────────────┐
│  GET /messages (or WS)     │
│  → Display to user         │
└────────────────────────────┘
```

---

## Directory Structure

```
backend/
├── core/
│   ├── encryption.py       # RSA + AES encryption
│   ├── routing.py          # OLSR mesh routing
│   ├── message_handler.py  # Message pipeline
│   └── __init__.py
├── api/
│   ├── rest_api.py         # FastAPI server
│   └── __init__.py
├── ml/
│   ├── anomaly_detection.py  # Threat detection
│   └── __init__.py
├── tests/
│   ├── test_encryption.py
│   ├── test_routing.py
│   └── test_e2e.py
├── main.py                 # Entry point
└── requirements.txt        # Dependencies
```

---

## Next Steps for Enhancement

1. **Perfect Forward Secrecy** - Signal Protocol integration
2. **Offline Queueing** - Store messages when offline
3. **Group Messaging** - Multi-recipient support
4. **Reputation System** - ML-based trust scoring
5. **iOS Support** - Native iOS app
6. **Blockchain** - Decentralized validation (optional)

---

*Diagram files and detailed source analysis available in source code*
