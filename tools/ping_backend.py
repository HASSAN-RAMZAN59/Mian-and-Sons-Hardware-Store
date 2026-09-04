#!/usr/bin/env python3
"""
Keep-Alive Ping Script for Render Backend
Usage:
    python tools/ping_backend.py https://your-backend.onrender.com
Or just:
    python tools/ping_backend.py
(It will prompt for your URL or read from environment / default)
"""

import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

# Interval in seconds: 14 minutes (840 seconds)
DEFAULT_INTERVAL_SECONDS = 840

def ping(url: str):
    # Ensure URL targets /ping or root
    target = url.rstrip("/")
    if not target.endswith("/ping"):
        target = f"{target}/ping"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start_time = time.time()
    
    req = urllib.request.Request(
        target,
        headers={"User-Agent": "Render-KeepAlive-Script/1.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            duration = round(time.time() - start_time, 2)
            code = response.getcode()
            body = response.read().decode("utf-8", errors="ignore")
            print(f"[{timestamp}] [OK] Ping successful -> {target} | HTTP {code} | {duration}s | Response: {body.strip()}")
            return True
    except urllib.error.HTTPError as e:
        duration = round(time.time() - start_time, 2)
        print(f"[{timestamp}] [WARN] Server returned HTTP {e.code} ({duration}s)")
        return True # Server is awake even if 404 or other status
    except Exception as e:
        duration = round(time.time() - start_time, 2)
        print(f"[{timestamp}] [ERROR] Ping failed: {e} ({duration}s)")
        return False

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    once = "--once" in sys.argv

    if args:
        target_url = args[0]
    else:
        import os
        target_url = os.getenv("RENDER_URL") or os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL")

    if not target_url:
        print("=" * 60)
        print("  Render Backend Keep-Alive Pinger")
        print("=" * 60)
        target_url = input("Enter your Render Backend URL (e.g. https://your-app.onrender.com): ").strip()

    if not target_url:
        print("Error: No URL provided. Exiting.")
        sys.exit(1)

    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    print("=" * 60)
    print(f"Starting keep-alive pings for: {target_url}")
    print(f"Interval: Every {DEFAULT_INTERVAL_SECONDS // 60} minutes")
    print("Press Ctrl+C to stop.")
    print("=" * 60)

    if once:
        ping(target_url)
        return

    while True:
        ping(target_url)
        print(f"Waiting {DEFAULT_INTERVAL_SECONDS // 60} minutes until next ping...")
        time.sleep(DEFAULT_INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nPing script stopped by user.")
