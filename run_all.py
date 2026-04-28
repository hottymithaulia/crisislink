#!/usr/bin/env python3
"""
CrisisLink Master Runner
One-command startup for backend and frontend.

Usage:
    python run_all.py

This script:
1. Checks/installs Node.js dependencies for backend
2. Checks/installs Node.js dependencies for frontend
3. Starts Node.js backend (Express + Socket.IO) on port 3001
4. Starts React frontend on port 3000
5. Handles graceful shutdown with Ctrl+C
"""

import subprocess
import sys
import os
import signal
import time
import threading
from pathlib import Path

# ============================================================
# Configuration
# ============================================================
BACKEND_DIR  = Path(__file__).parent / "backend"   # Node.js backend
FRONTEND_DIR = Path(__file__).parent / "frontend"  # React frontend
BACKEND_PORT  = 3001
FRONTEND_PORT = 3000

# Global process references for cleanup
backend_process  = None
frontend_process = None

# ============================================================
# Helper: stream process output in a thread
# ============================================================
def stream_output(process, prefix):
    """Print subprocess output with a colored prefix."""
    try:
        for line in iter(process.stdout.readline, ''):
            if line.strip():
                print(f"{prefix} {line}", end='', flush=True)
    except Exception:
        pass


# ============================================================
# Print banner
# ============================================================
def print_header():
    print("\n" + "=" * 70)
    print("🚀 CrisisLink System Launcher")
    print("=" * 70)
    print("Starting Node.js backend + React frontend...")
    print("-" * 70)


# ============================================================
# Dependency checks
# ============================================================
def install_node_deps(directory: Path, label: str) -> bool:
    node_modules = directory / "node_modules"
    if node_modules.exists():
        print(f"✅ {label} node_modules already installed")
        return True

    print(f"📦 Installing {label} dependencies (may take a minute)...")
    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=directory,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ npm install failed for {label}:")
            print(result.stderr[:500])
            return False
        print(f"✅ {label} dependencies installed")
        return True
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js from https://nodejs.org")
        return False
    except Exception as e:
        print(f"❌ Failed to install {label} deps: {e}")
        return False


# ============================================================
# Start backend (Node.js / Express on port 3001)
# ============================================================
def start_backend() -> bool:
    global backend_process

    print(f"🔥 Starting Node.js backend on port {BACKEND_PORT}...")

    try:
        backend_process = subprocess.Popen(
            ["node", "core/server.js"],
            cwd=BACKEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Stream backend output in background thread
        t = threading.Thread(
            target=stream_output,
            args=(backend_process, "[BACKEND]"),
            daemon=True
        )
        t.start()

        # Wait briefly to catch immediate startup failures
        time.sleep(2)

        if backend_process.poll() is None:
            print(f"✅ Backend running at http://localhost:{BACKEND_PORT}")
            return True
        else:
            print("❌ Backend process exited immediately — check output above")
            return False

    except FileNotFoundError:
        print("❌ 'node' not found. Please install Node.js from https://nodejs.org")
        return False
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False


# ============================================================
# Start frontend (React / CRA on port 3000)
# ============================================================
def start_frontend() -> bool:
    global frontend_process

    print(f"⚛️  Starting React frontend on port {FRONTEND_PORT}...")

    # Disable CRA's auto-open-browser behaviour
    env = os.environ.copy()
    env["BROWSER"] = "none"
    env["PORT"] = str(FRONTEND_PORT)

    try:
        frontend_process = subprocess.Popen(
            "npm start",
            cwd=FRONTEND_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            shell=True,
            env=env
        )

        # Stream frontend output in background thread
        t = threading.Thread(
            target=stream_output,
            args=(frontend_process, "[FRONTEND]"),
            daemon=True
        )
        t.start()

        # Wait for CRA to boot (it takes ~5 s)
        time.sleep(6)

        if frontend_process.poll() is None:
            print(f"✅ Frontend running at http://localhost:{FRONTEND_PORT}")
            return True
        else:
            print("❌ Frontend process exited immediately — check output above")
            return False

    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        return False


# ============================================================
# Print running status
# ============================================================
def print_status():
    print("\n" + "=" * 70)
    print("✨ CrisisLink is running!")
    print("=" * 70)
    print(f"\n📱 Frontend:  http://localhost:{FRONTEND_PORT}")
    print(f"🔌 Backend:   http://localhost:{BACKEND_PORT}")
    print(f"📊 Health:    http://localhost:{BACKEND_PORT}/health")
    print(f"📋 Events:    http://localhost:{BACKEND_PORT}/events/all")
    print("\n" + "-" * 70)
    print("Share the frontend URL with phones on the same Wi-Fi network.")
    print("Find your local IP: ipconfig (Windows) | ifconfig (Mac/Linux)")
    print("Press Ctrl+C to stop both servers")
    print("=" * 70 + "\n")


# ============================================================
# Graceful shutdown handler
# ============================================================
def signal_handler(sig, frame):
    print("\n\n🛑 Shutting down CrisisLink...")

    if backend_process and backend_process.poll() is None:
        print("🔥 Stopping backend...")
        backend_process.terminate()
        try:
            backend_process.wait(timeout=5)
        except Exception:
            backend_process.kill()

    if frontend_process and frontend_process.poll() is None:
        print("⚛️  Stopping frontend...")
        frontend_process.terminate()
        try:
            frontend_process.wait(timeout=5)
        except Exception:
            frontend_process.kill()

    print("✅ Shutdown complete. Goodbye! 👋\n")
    sys.exit(0)


# ============================================================
# Main
# ============================================================
def main():
    print_header()

    # Register signal handlers
    signal.signal(signal.SIGINT,  signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Install Node.js dependencies
    if not install_node_deps(BACKEND_DIR, "Backend"):
        return 1
    if not install_node_deps(FRONTEND_DIR, "Frontend"):
        return 1

    # Start services
    if not start_backend():
        return 1
    if not start_frontend():
        if backend_process:
            backend_process.terminate()
        return 1

    print_status()

    # Monitor — restart on unexpected death? For now just report and exit.
    try:
        while True:
            time.sleep(2)

            if backend_process.poll() is not None:
                print("\n❌ Backend process died unexpectedly")
                signal_handler(None, None)

            if frontend_process.poll() is not None:
                print("\n❌ Frontend process died unexpectedly")
                signal_handler(None, None)

    except KeyboardInterrupt:
        signal_handler(None, None)

    return 0


if __name__ == "__main__":
    sys.exit(main())
