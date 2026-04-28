#!/usr/bin/env python3
"""
Secure Mesh Network - Main Backend Server
Run: python main.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Configuration
    HOST = os.getenv("MESH_HOST", "0.0.0.0")
    PORT = int(os.getenv("MESH_PORT", 8000))
    NODE_ID = os.getenv("NODE_ID", "node_default")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    print("""
    ╔═══════════════════════════════════════════╗
    ║   SECURE MESH NETWORK - BACKEND SERVER    ║
    ╚═══════════════════════════════════════════╝
    """)
    
    print(f"🚀 Starting Mesh Network...")
    print(f"   Node ID: {NODE_ID}")
    print(f"   Host: {HOST}:{PORT}")
    print(f"   Debug: {DEBUG}")
    print()
    
    # Import API
    from api.rest_api import app
    
    # Run server
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="debug" if DEBUG else "info",
        reload=DEBUG
    )
